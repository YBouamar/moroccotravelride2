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

async function sendExpense(job: Extract<QueueJob, { kind: 'expense' }>): Promise<JobOutcome> {
  let receiptPath: string | null = null;
  if (job.photoUri) {
    const photo = new File(job.photoUri);
    if (photo.exists) {
      receiptPath = `${job.companyId}/${job.clientRef}.jpg`;
      const upload = await supabase.storage
        .from('expense-receipts')
        .upload(receiptPath, await photo.bytes(), { contentType: 'image/jpeg', upsert: false });
      // Already uploaded by a previous attempt whose answer was lost: keep going.
      if (upload.error && !/exist|duplicate/i.test(upload.error.message)) return 'retry';
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
