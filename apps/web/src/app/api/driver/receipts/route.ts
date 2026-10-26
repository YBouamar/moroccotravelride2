import type { Database } from '@mtr/db';
import { ACCEPTED_DOCUMENT_MIME, detectDocumentType, MAX_DOCUMENT_BYTES } from '@mtr/shared';
import { createClient } from '@supabase/supabase-js';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getPublicEnv } from '@/lib/env';
import { consumeRateLimit } from '@/lib/security/rate-limit';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Receipt upload from the driver app (security audit 2026-10-26, finding 1). The app sends its
 * access token; the route checks the member, the V2 offer, the size and the real file type
 * (first bytes), then stores the file at {company_id}/{client_ref}.{ext}. Drivers cannot write
 * the bucket directly any more.
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const env = getPublicEnv();
  // A client acting as the user: RLS and the helper functions see the driver's identity.
  const userClient = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  const { data: user } = await userClient.auth.getUser(token);
  if (!user.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const fields = z
    .object({ companyId: z.uuid(), clientRef: z.uuid() })
    .safeParse({ companyId: form?.get('companyId'), clientRef: form?.get('clientRef') });
  const file = form?.get('file');
  if (!fields.success || !(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  if (file.size > MAX_DOCUMENT_BYTES)
    return NextResponse.json({ error: 'fileSize' }, { status: 413 });
  if (!(await consumeRateLimit('upload-user', user.user.id, 20, 60 * 60))) {
    return NextResponse.json({ error: 'rateLimited' }, { status: 429 });
  }

  const { data: allowed } = await userClient.rpc('receipt_upload_allowed', {
    p_company: fields.data.companyId,
  });
  if (allowed !== true) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectDocumentType(bytes);
  if (!mime) return NextResponse.json({ error: 'fileType' }, { status: 415 });

  const path = `${fields.data.companyId}/${fields.data.clientRef}.${ACCEPTED_DOCUMENT_MIME[mime]}`;
  const upload = await createAdminClient()
    .storage.from('expense-receipts')
    .upload(path, bytes, { contentType: mime, upsert: false });
  // Already stored by a previous attempt of the offline queue: same path, same file.
  if (upload.error && !/exist|duplicate/i.test(upload.error.message)) {
    return NextResponse.json({ error: 'unknown' }, { status: 500 });
  }
  return NextResponse.json({ path });
}
