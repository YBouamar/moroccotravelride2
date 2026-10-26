import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { flushOutbox } from '@/lib/email/outbox';
import { getServerEnv } from '@/lib/env.server';

/**
 * Flushes the e-mail outbox. Called every few minutes by the server scheduler (Coolify scheduled
 * task or system cron: `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron/emails`).
 * Disabled (404) while CRON_SECRET is not configured.
 */
export async function POST(request: NextRequest) {
  const secret = getServerEnv().CRON_SECRET;
  const header = request.headers.get('authorization') ?? '';
  const expected = Buffer.from(`Bearer ${secret ?? ''}`);
  const received = Buffer.from(header);
  if (!secret || expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return new NextResponse(null, { status: 404 });
  }
  const processed = await flushOutbox(50);
  return NextResponse.json({ processed });
}
