import { blobStore } from "./blob";
import { fsStore } from "./fs";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export type { Store, StoredObject } from "./types";

let instance: Store | null = null;

/**
 * Which store is used:
 *   STORE_DRIVER=supabase  -> Supabase Storage (STORE_SUPABASE_URL / _KEY / _BUCKET)
 *   STORE_DRIVER=blob      -> Vercel Blob (BLOB_READ_WRITE_TOKEN)
 *   otherwise              -> local files under .data/
 *
 * On a serverless host the local driver would silently lose data, so
 * production refuses to start without a real store.
 */
export function store(): Store {
  if (instance) return instance;
  const driver = process.env.STORE_DRIVER || (process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "fs");

  if (driver === "supabase") {
    const url = process.env.STORE_SUPABASE_URL;
    const key = process.env.STORE_SUPABASE_KEY;
    if (!url || !key) throw new Error("STORE_DRIVER=supabase needs STORE_SUPABASE_URL and STORE_SUPABASE_KEY");
    instance = supabaseStore(url, key, process.env.STORE_SUPABASE_BUCKET || "doc-tool");
  } else if (driver === "blob") {
    instance = blobStore();
  } else {
    if (process.env.VERCEL && !process.env.ALLOW_EPHEMERAL_STORE) {
      throw new Error("No persistent store configured. Set STORE_DRIVER (see README) before serving traffic.");
    }
    instance = fsStore();
  }
  return instance;
}

export async function getJson<T>(key: string): Promise<T | null> {
  const text = await store().get(key);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function putJson(key: string, value: unknown): Promise<void> {
  await store().put(key, JSON.stringify(value));
}
