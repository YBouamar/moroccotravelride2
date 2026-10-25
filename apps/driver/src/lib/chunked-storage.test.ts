import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, createChunkedStorage, type KeyValueBackend } from './chunked-storage';

function memoryBackend(): KeyValueBackend & { keys: () => string[] } {
  const map = new Map<string, string>();
  return {
    getItem: async (key) => map.get(key) ?? null,
    setItem: async (key, value) => void map.set(key, value),
    removeItem: async (key) => void map.delete(key),
    keys: () => [...map.keys()],
  };
}

describe('createChunkedStorage', () => {
  it('round-trips a value larger than one chunk', async () => {
    const backend = memoryBackend();
    const storage = createChunkedStorage(backend);
    const session = 'x'.repeat(CHUNK_SIZE * 2 + 10);
    await storage.setItem('sb-session', session);
    expect(await storage.getItem('sb-session')).toBe(session);
    expect(backend.keys()).toHaveLength(4); // 3 chunks + count
  });

  it('removes stale chunks when a value shrinks', async () => {
    const backend = memoryBackend();
    const storage = createChunkedStorage(backend);
    await storage.setItem('k', 'y'.repeat(CHUNK_SIZE * 3));
    await storage.setItem('k', 'short');
    expect(await storage.getItem('k')).toBe('short');
    expect(backend.keys()).toEqual(['k.0', 'k.chunks']);
  });

  it('returns null for missing or partially written values', async () => {
    const backend = memoryBackend();
    const storage = createChunkedStorage(backend);
    expect(await storage.getItem('nothing')).toBeNull();
    await backend.setItem('broken.chunks', '2');
    await backend.setItem('broken.0', 'half');
    expect(await storage.getItem('broken')).toBeNull();
  });

  it('removes every chunk', async () => {
    const backend = memoryBackend();
    const storage = createChunkedStorage(backend);
    await storage.setItem('k', 'z'.repeat(CHUNK_SIZE + 1));
    await storage.removeItem('k');
    expect(backend.keys()).toEqual([]);
  });
});
