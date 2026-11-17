/**
 * A tiny object store. Everything the app persists (leads, captured emails,
 * funnel events, usage counters) goes through this interface, so the backing
 * service can be swapped with one environment variable.
 *
 * Uploaded documents are never written here: they are read in memory and
 * dropped when the request ends.
 */
export interface StoredObject {
  key: string;
  /** ISO timestamp of the last write, when the backend reports one. */
  updatedAt?: string;
}

export interface Store {
  kind: string;
  put(key: string, body: string): Promise<void>;
  get(key: string): Promise<string | null>;
  /** Keys under a prefix (recursive). */
  list(prefix: string): Promise<StoredObject[]>;
  del(keys: string[]): Promise<void>;
}
