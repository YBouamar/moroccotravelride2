/**
 * Splits large values across several keys. The Supabase session (JSON with tokens) can exceed
 * the ~2 KB per-item limit of the Android keystore-backed SecureStore.
 */
export interface KeyValueBackend {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const CHUNK_SIZE = 1800;

export function createChunkedStorage(backend: KeyValueBackend): KeyValueBackend {
  const countKey = (key: string) => `${key}.chunks`;
  const chunkKey = (key: string, index: number) => `${key}.${index}`;

  async function removeItem(key: string) {
    const count = Number((await backend.getItem(countKey(key))) ?? 0);
    for (let i = 0; i < count; i++) await backend.removeItem(chunkKey(key, i));
    await backend.removeItem(countKey(key));
  }

  return {
    async getItem(key) {
      const raw = await backend.getItem(countKey(key));
      if (raw === null) return null;
      const parts: string[] = [];
      for (let i = 0; i < Number(raw); i++) {
        const part = await backend.getItem(chunkKey(key, i));
        if (part === null) return null; // partial write: treat as missing
        parts.push(part);
      }
      return parts.join('');
    },
    async setItem(key, value) {
      await removeItem(key);
      const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
      for (let i = 0; i < count; i++) {
        await backend.setItem(chunkKey(key, i), value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
      }
      await backend.setItem(countKey(key), String(count));
    },
    removeItem,
  };
}
