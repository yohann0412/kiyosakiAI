import type { Store, StoredObject } from "./types";

/**
 * Supabase Storage (private bucket) over plain REST.
 *
 * Needs STORE_SUPABASE_URL, STORE_SUPABASE_KEY (a secret/service key) and a
 * private bucket (STORE_SUPABASE_BUCKET, default "doc-tool"). The bucket is
 * created on first use if the key is allowed to.
 */
export function supabaseStore(url: string, key: string, bucket = "doc-tool"): Store {
  const base = `${url.replace(/\/+$/, "")}/storage/v1`;
  const headers = { Authorization: `Bearer ${key}`, apikey: key };
  let ready: Promise<void> | null = null;

  const ensureBucket = () =>
    (ready ??= (async () => {
      const res = await fetch(`${base}/bucket/${bucket}`, { headers });
      if (res.ok) return;
      const created = await fetch(`${base}/bucket`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: bucket, name: bucket, public: false }),
      });
      if (!created.ok && created.status !== 409) {
        ready = null;
        throw new Error(`store: cannot create bucket (${created.status})`);
      }
    })());

  const objectUrl = (k: string) => `${base}/object/${bucket}/${k.split("/").map(encodeURIComponent).join("/")}`;

  async function listDir(prefix: string, out: StoredObject[]) {
    const limit = 1000;
    for (let offset = 0; ; offset += limit) {
      const res = await fetch(`${base}/object/list/${bucket}`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, limit, offset, sortBy: { column: "name", order: "asc" } }),
      });
      if (!res.ok) throw new Error(`store: list failed (${res.status})`);
      const items = (await res.json()) as { name: string; id: string | null; updated_at?: string }[];
      for (const item of items) {
        const full = prefix ? `${prefix}/${item.name}` : item.name;
        // Folders come back with a null id.
        if (item.id === null) await listDir(full, out);
        else out.push({ key: full, updatedAt: item.updated_at });
      }
      if (items.length < limit) break;
    }
  }

  return {
    kind: "supabase",
    async put(k, body) {
      await ensureBucket();
      const res = await fetch(objectUrl(k), {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json", "x-upsert": "true" },
        body,
      });
      if (!res.ok) throw new Error(`store: put failed (${res.status})`);
    },
    async get(k) {
      await ensureBucket();
      const res = await fetch(objectUrl(k), { headers, cache: "no-store" });
      if (res.status === 404 || res.status === 400) return null;
      if (!res.ok) throw new Error(`store: get failed (${res.status})`);
      return res.text();
    },
    async list(prefix) {
      await ensureBucket();
      const out: StoredObject[] = [];
      await listDir(prefix.replace(/\/+$/, ""), out);
      return out;
    },
    async del(keys) {
      if (!keys.length) return;
      await ensureBucket();
      for (let i = 0; i < keys.length; i += 500) {
        const res = await fetch(`${base}/object/${bucket}`, {
          method: "DELETE",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ prefixes: keys.slice(i, i + 500) }),
        });
        if (!res.ok) throw new Error(`store: delete failed (${res.status})`);
      }
    },
  };
}
