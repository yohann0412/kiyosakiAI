import { promises as fs } from "node:fs";
import path from "node:path";
import type { Store, StoredObject } from "./types";

/** Local files under .data/ - for development, tests and the eval runner. */
export function fsStore(root = path.join(process.cwd(), ".data")): Store {
  const resolve = (key: string) => {
    const full = path.resolve(root, key);
    if (!full.startsWith(path.resolve(root) + path.sep)) throw new Error("bad key");
    return full;
  };

  async function walk(dir: string, out: StoredObject[]) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full, out);
      else {
        const stat = await fs.stat(full);
        out.push({ key: path.relative(root, full).split(path.sep).join("/"), updatedAt: stat.mtime.toISOString() });
      }
    }
  }

  return {
    kind: "fs",
    async put(key, body) {
      const full = resolve(key);
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, body, "utf8");
    },
    async get(key) {
      try {
        return await fs.readFile(resolve(key), "utf8");
      } catch {
        return null;
      }
    },
    async list(prefix) {
      const out: StoredObject[] = [];
      const clean = prefix.replace(/\/+$/, "");
      await walk(resolve(clean || "."), out);
      return out.sort((a, b) => a.key.localeCompare(b.key));
    },
    async del(keys) {
      await Promise.all(keys.map((key) => fs.rm(resolve(key), { force: true })));
    },
  };
}
