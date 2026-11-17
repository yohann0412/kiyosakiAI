import type { Store, StoredObject } from "./types";

/**
 * Vercel Blob, private access. Needs a Blob store connected to the project
 * (which provides BLOB_READ_WRITE_TOKEN).
 */
export function blobStore(): Store {
  const sdk = () => import("@vercel/blob");

  return {
    kind: "blob",
    async put(key, body) {
      const { put } = await sdk();
      await put(key, body, {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: "application/json",
      });
    },
    async get(key) {
      const { get } = await sdk();
      // Counters must be read fresh, not from the CDN cache.
      const result = await get(key, { access: "private", useCache: false });
      if (!result || result.statusCode !== 200) return null;
      return new Response(result.stream).text();
    },
    async list(prefix) {
      const { list } = await sdk();
      const out: StoredObject[] = [];
      let cursor: string | undefined;
      do {
        const page = await list({ prefix, cursor, limit: 1000 });
        for (const blob of page.blobs) out.push({ key: blob.pathname, updatedAt: blob.uploadedAt.toISOString() });
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return out;
    },
    async del(keys) {
      if (!keys.length) return;
      const { del } = await sdk();
      for (let i = 0; i < keys.length; i += 500) await del(keys.slice(i, i + 500));
    },
  };
}
