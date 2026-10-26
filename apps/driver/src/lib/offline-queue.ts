/**
 * Offline queue of the driver app (step 19). Network calls that fail (no signal on the road) are
 * kept on the device and replayed later. Each job is idempotent server side (expenses carry a
 * client_ref, positions are timestamped), so replaying never creates duplicates.
 */

export interface LocationPoint {
  lat: number;
  lng: number;
  accuracy: number | null;
  at: string;
}

export type QueueJob =
  | { id: string; kind: 'locations'; tripId: string; points: LocationPoint[]; attempts: number }
  | {
      id: string;
      kind: 'expense';
      clientRef: string;
      companyId: string;
      category: string;
      amountCents: number;
      spentOn: string;
      description: string;
      tripId: string | null;
      photoUri: string | null;
      attempts: number;
    };

export type NewJob = QueueJob extends infer J
  ? J extends QueueJob
    ? Omit<J, 'id' | 'attempts'>
    : never
  : never;

/** What a handler reports: sent, retry later (network), or drop (refused by the server). */
export type JobOutcome = 'done' | 'retry' | 'drop';

export interface QueueStorage {
  read: () => Promise<string | null>;
  write: (value: string) => Promise<void>;
}

/** Positions older than this are useless for live tracking and too heavy to keep. */
export const MAX_POINTS_PER_TRIP = 2000;
export const MAX_ATTEMPTS = 20;

export function createOfflineQueue(storage: QueueStorage, newId: () => string) {
  let jobs: QueueJob[] | null = null;

  async function load(): Promise<QueueJob[]> {
    if (jobs) return jobs;
    try {
      const raw = await storage.read();
      jobs = raw ? (JSON.parse(raw) as QueueJob[]) : [];
    } catch {
      jobs = [];
    }
    return jobs;
  }

  const save = async () => storage.write(JSON.stringify(jobs ?? []));

  return {
    async size() {
      return (await load()).length;
    },

    async enqueue(job: NewJob) {
      const list = await load();
      if (job.kind === 'locations') {
        // One pending batch per trip: new points are appended, the oldest dropped if too many.
        const existing = list.find(
          (item): item is Extract<QueueJob, { kind: 'locations' }> =>
            item.kind === 'locations' && item.tripId === job.tripId,
        );
        if (existing) {
          existing.points = [...existing.points, ...job.points].slice(-MAX_POINTS_PER_TRIP);
          await save();
          return;
        }
        list.push({
          ...job,
          points: job.points.slice(-MAX_POINTS_PER_TRIP),
          id: newId(),
          attempts: 0,
        });
      } else {
        list.push({ ...job, id: newId(), attempts: 0 } as QueueJob);
      }
      await save();
    },

    /** Replays the jobs in order; stops at the first network failure to keep the order. */
    async flush(handle: (job: QueueJob) => Promise<JobOutcome>): Promise<number> {
      const list = await load();
      let sent = 0;
      while (list.length > 0) {
        const job = list[0]!;
        let outcome: JobOutcome;
        try {
          outcome = await handle(job);
        } catch {
          outcome = 'retry';
        }
        if (outcome === 'retry') {
          job.attempts += 1;
          if (job.attempts >= MAX_ATTEMPTS) list.shift();
          await save();
          break;
        }
        list.shift();
        if (outcome === 'done') sent += 1;
        await save();
      }
      return sent;
    },
  };
}

export type OfflineQueue = ReturnType<typeof createOfflineQueue>;
