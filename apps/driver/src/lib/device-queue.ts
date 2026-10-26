import type { Json } from '@mtr/db';
import { File, Paths } from 'expo-file-system';
import { supabase } from './supabase';
import { createOfflineQueue, type JobOutcome, type QueueJob } from './offline-queue';

/** The offline queue stored in the app's private documents folder (not shared, not backed up). */
const queueFile = new File(Paths.document, 'mtr-offline-queue.json');

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const offlineQueue = createOfflineQueue(
  {
    read: async () => (queueFile.exists ? queueFile.text() : null),
    write: async (value) => {
      if (!queueFile.exists) queueFile.create();
      await queueFile.write(value);
    },
  },
  newId,
);

/** Network errors are retried; refusals by the database (RLS, business rules) are dropped. */
const outcomeOf = (error: { code?: string; message?: string } | null): JobOutcome => {
  if (!error) return 'done';
  return error.code ? 'drop' : 'retry';
};

async function sendLocations(job: Extract<QueueJob, { kind: 'locations' }>): Promise<JobOutcome> {
  const { error } = await supabase.rpc('record_driver_locations', {
    p_trip: job.tripId,
    p_points: job.points as unknown as Json,
  });
  return outcomeOf(error);
}

// The web API checks the real file type before storing it (security audit 2026-10-26).
const API_URL = process.env.EXPO_PUBLIC_API_URL;

async function uploadReceipt(
  companyId: string,
  clientRef: string,
  uri: string,
): Promise<string | null | 'retry'> {
  const { data } = await supabase.auth.getSession();
  if (!API_URL || !data.session) return 'retry';
  const form = new FormData();
  form.append('companyId', companyId);
  form.append('clientRef', clientRef);
  // React Native sends a local file from its URI.
  form.append('file', { uri, name: `${clientRef}.jpg`, type: 'image/jpeg' } as unknown as Blob);
  try {
    const response = await fetch(`${API_URL}/api/driver/receipts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${data.session.access_token}` },
      body: form,
    });
    if (response.ok) return ((await response.json()) as { path: string }).path;
    // Refused (type, size, rights): the expense is still sent, without the receipt.
    return response.status >= 500 || response.status === 429 ? 'retry' : null;
  } catch {
    return 'retry';
  }
}

async function sendExpense(job: Extract<QueueJob, { kind: 'expense' }>): Promise<JobOutcome> {
  let receiptPath: string | null = null;
  if (job.photoUri) {
    const photo = new File(job.photoUri);
    if (photo.exists) {
      const result = await uploadReceipt(job.companyId, job.clientRef, photo.uri);
      if (result === 'retry') return 'retry';
      receiptPath = result;
    }
  }
  // client_ref makes the insert idempotent: replaying after a lost answer never duplicates.
  const { error } = await supabase.from('expenses').upsert(
    {
      company_id: job.companyId,
      category: job.category as 'fuel',
      amount_cents: job.amountCents,
      spent_on: job.spentOn,
      description: job.description || null,
      trip_id: job.tripId,
      receipt_path: receiptPath,
      client_ref: job.clientRef,
    },
    { onConflict: 'client_ref', ignoreDuplicates: true },
  );
  const outcome = outcomeOf(error);
  if (outcome !== 'retry' && job.photoUri) {
    const photo = new File(job.photoUri);
    if (photo.exists) photo.delete();
  }
  return outcome;
}

let flushing: Promise<number> | null = null;

/** Sends what is waiting; safe to call often (one flush at a time). */
export function flushOfflineQueue(): Promise<number> {
  flushing ??= offlineQueue
    .flush((job) => (job.kind === 'locations' ? sendLocations(job) : sendExpense(job)))
    .finally(() => {
      flushing = null;
    });
  return flushing;
}

/** Copies a picked photo into the app's folder so that it survives until it is uploaded. */
export async function keepPhoto(uri: string, clientRef: string): Promise<string> {
  const target = new File(Paths.document, `receipt-${clientRef}.jpg`);
  await new File(uri).copy(target);
  return target.uri;
}
