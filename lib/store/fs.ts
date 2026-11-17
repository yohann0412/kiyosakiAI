import { promises as fs } from "node:fs";
import path from "node:path";
import type { Store, StoredObject } from "./types";

/**
 * Local files under .data/ - for development, tests and scripts. Never used
 * on a serverless host (see ./index.ts), so the bundler is told not to trace
 * these dynamic paths into the deployment.
 */
export function fsStore(root = path.join(/*turbopackIgnore: true*/ process.cwd(), ".data")): Store {
  const base = path.resolve(/*turbopackIgnore: true*/ root);
  const resolve = (key: string) => {
    const full = path.resolve(/*turbopackIgnore: true*/ base, key);
    if (full !== base && !full.startsWith(base + path.sep)) throw new Error("bad key");
    return full;
  };

  async function walk(dir: string, out: StoredObject[]) {
    let entries;
    try {
      entries = await fs.readdir(/*turbopackIgnore: true*/ dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(/*turbopackIgnore: true*/ dir, entry.name);
      if (entry.isDirectory()) await walk(full, out);
      else {
        const stat = await fs.stat(/*turbopackIgnore: true*/ full);
        out.push({ key: path.relative(base, full).split(path.sep).join("/"), updatedAt: stat.mtime.toISOString() });
      }
    }
  }

  return {
    kind: "fs",
    async put(key, body) {
      const full = resolve(key);
      await fs.mkdir(/*turbopackIgnore: true*/ path.dirname(full), { recursive: true });
      await fs.writeFile(/*turbopackIgnore: true*/ full, body, "utf8");
    },
    async get(key) {
      try {
        return await fs.readFile(/*turbopackIgnore: true*/ resolve(key), "utf8");
      } catch {
        return null;
      }
    },
    async list(prefix) {
      const out: StoredObject[] = [];
      const clean = prefix.replace(/\/+$/, "");
      await walk(clean ? resolve(clean) : base, out);
      return out.sort((a, b) => a.key.localeCompare(b.key));
    },
    async del(keys) {
      await Promise.all(keys.map((key) => fs.rm(/*turbopackIgnore: true*/ resolve(key), { force: true })));
    },
  };
}
