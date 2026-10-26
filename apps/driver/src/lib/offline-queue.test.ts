import { describe, expect, it } from 'vitest';
import { createOfflineQueue, MAX_ATTEMPTS, type QueueJob } from './offline-queue';

function memoryStorage() {
  let value: string | null = null;
  return {
    read: async () => value,
    write: async (next: string) => void (value = next),
    peek: () => value,
  };
}

let counter = 0;
const newId = () => `job-${++counter}`;
const point = (at: string) => ({ lat: 33.57, lng: -7.59, accuracy: 10, at });

describe('offline queue', () => {
  it('merges the positions of the same trip into one batch', async () => {
    const queue = createOfflineQueue(memoryStorage(), newId);
    await queue.enqueue({
      kind: 'locations',
      tripId: 't1',
      points: [point('2026-10-26T10:00:00Z')],
    });
    await queue.enqueue({
      kind: 'locations',
      tripId: 't1',
      points: [point('2026-10-26T10:00:15Z')],
    });
    await queue.enqueue({
      kind: 'locations',
      tripId: 't2',
      points: [point('2026-10-26T10:00:20Z')],
    });
    expect(await queue.size()).toBe(2);
    const seen: QueueJob[] = [];
    await queue.flush(async (job) => (seen.push(job), 'done'));
    expect(seen[0]).toMatchObject({ kind: 'locations', tripId: 't1' });
    expect(seen[0]?.kind === 'locations' && seen[0].points).toHaveLength(2);
  });

  it('keeps the order and stops at the first network failure', async () => {
    const storage = memoryStorage();
    const queue = createOfflineQueue(storage, newId);
    await queue.enqueue({
      kind: 'locations',
      tripId: 't1',
      points: [point('2026-10-26T10:00:00Z')],
    });
    await queue.enqueue({
      kind: 'expense',
      clientRef: 'c1',
      companyId: 'co',
      category: 'fuel',
      amountCents: 45_000,
      spentOn: '2026-10-26',
      description: '',
      tripId: null,
      photoUri: null,
    });
    expect(await queue.flush(async () => 'retry')).toBe(0);
    expect(await queue.size()).toBe(2);
    // Survives an app restart: a new queue on the same storage sees the jobs.
    const restarted = createOfflineQueue(storage, newId);
    expect(await restarted.flush(async () => 'done')).toBe(2);
    expect(await restarted.size()).toBe(0);
  });

  it('drops refused jobs and gives up after too many attempts', async () => {
    const queue = createOfflineQueue(memoryStorage(), newId);
    await queue.enqueue({
      kind: 'locations',
      tripId: 't1',
      points: [point('2026-10-26T10:00:00Z')],
    });
    await queue.enqueue({
      kind: 'locations',
      tripId: 't2',
      points: [point('2026-10-26T10:00:00Z')],
    });
    expect(
      await queue.flush(async (job) =>
        job.kind === 'locations' && job.tripId === 't1' ? 'drop' : 'done',
      ),
    ).toBe(1);
    await queue.enqueue({
      kind: 'locations',
      tripId: 't3',
      points: [point('2026-10-26T10:00:00Z')],
    });
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1)
      await queue.flush(async () => 'retry');
    expect(await queue.size()).toBe(0);
  });

  it('recovers from a corrupted storage', async () => {
    const queue = createOfflineQueue(
      { read: async () => '{not json', write: async () => {} },
      newId,
    );
    expect(await queue.size()).toBe(0);
  });
});
