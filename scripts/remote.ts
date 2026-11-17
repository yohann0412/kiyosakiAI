/**
 * The nightly scripts read production data one of two ways:
 *   - through the site's admin endpoints (SITE_URL + ADMIN_TOKEN), or
 *   - straight from the store (STORE_DRIVER and its credentials, or .data/ locally).
 */
export function remoteConfigured(): boolean {
  return Boolean(process.env.SITE_URL && process.env.ADMIN_TOKEN);
}

export async function remoteGet<T>(pathname: string): Promise<T> {
  const base = (process.env.SITE_URL ?? "").replace(/\/+$/, "");
  const res = await fetch(base + pathname, { headers: { Authorization: `Bearer ${process.env.ADMIN_TOKEN}` } });
  if (!res.ok) throw new Error(`${pathname} returned ${res.status}`);
  return (await res.json()) as T;
}
