/**
 * The nightly scripts read production data one of two ways:
 *   - through the site's admin endpoints (SITE_URL + ADMIN_TOKEN), or
 *   - straight from the store (STORE_DRIVER and its credentials, or .data/ locally).
 */
export function remoteConfigured(): boolean {
  return Boolean(process.env.SITE_URL && process.env.ADMIN_TOKEN);
}

/** Run the deployed extractor on a document (admin endpoint). */
export async function remoteExtract<T>(
  files: { data: Uint8Array; mediaType: string; name: string }[],
  fields: Record<string, string | undefined>,
): Promise<T> {
  const form = new FormData();
  for (const file of files) form.append("file", new Blob([file.data as BlobPart], { type: file.mediaType }), file.name);
  for (const [key, value] of Object.entries(fields)) if (value) form.append(key, value);
  const base = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
  const res = await fetch(base + "/api/admin/extract", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` },
    body: form,
  });
  const body = (await res.json().catch(() => ({}))) as { result?: T; error?: string; message?: string };
  if (!res.ok || !body.result) throw new Error(`${body.error ?? res.status}: ${body.message ?? "remote extraction failed"}`);
  return body.result;
}

export async function remoteGet<T>(pathname: string): Promise<T> {
  const base = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
  const res = await fetch(base + pathname, { headers: { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` } });
  if (!res.ok) throw new Error(`${pathname} returned ${res.status}`);
  return (await res.json()) as T;
}
