/**
 * Funnel numbers for the morning report.
 *
 *   npm run metrics              yesterday vs the average of the 7 days before it
 *   npm run metrics -- --json    machine-readable
 *   npm run metrics -- --day 2026-11-17
 *
 * Days are UTC. Reads the live site when SITE_URL and ADMIN_TOKEN are set,
 * otherwise the configured store (locally: .data/).
 */
import { FUNNEL, funnelValue, lastDays, metrics, type DayMetrics } from "@/lib/metrics";
import { remoteConfigured, remoteGet } from "./remote";

const args = process.argv.slice(2);
const dayArg = args.includes("--day") ? args[args.indexOf("--day") + 1] : null;

async function main() {
  const end = dayArg ? new Date(`${dayArg}T12:00:00Z`) : new Date(Date.now() - 86_400_000);
  const days = lastDays(8, end);
  let data: DayMetrics[];
  let source: string;
  if (remoteConfigured()) {
    const all = (await remoteGet<{ days: DayMetrics[] }>("/api/admin/metrics?days=40")).days;
    data = days.map((day) => all.find((d) => d.day === day)).filter((d): d is DayMetrics => Boolean(d));
    source = process.env.SITE_URL ?? "";
  } else {
    data = await metrics(days);
    source = `store (${process.env.STORE_DRIVER ?? (process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local .data/")})`;
  }
  if (!data.length) throw new Error("no metrics returned");

  const target = data[data.length - 1];
  const prior = data.slice(0, -1);
  const avg = (key: (typeof FUNNEL)[number]["key"]) =>
    prior.length ? prior.reduce((n, d) => n + funnelValue(d, key), 0) / prior.length : 0;
  const rows = FUNNEL.map((step) => ({
    step: step.label,
    key: step.key,
    day: funnelValue(target, step.key),
    avg7: Number(avg(step.key).toFixed(1)),
  }));
  const pages = Object.entries(target.pages)
    .map(([page, counts]) => ({
      page,
      visits: counts.visit ?? 0,
      uploads: counts.upload ?? 0,
      ok: counts.extract_ok ?? 0,
      downloads: counts.download ?? 0,
      emails: counts.email ?? 0,
      leads: counts.lead ?? 0,
    }))
    .sort((a, b) => b.visits - a.visits || b.uploads - a.uploads);
  const spend8 = data.reduce((n, d) => n + d.modelSpendUsd, 0);

  if (args.includes("--json")) {
    console.log(JSON.stringify({ source, day: target.day, funnel: rows, pages, modelSpendUsd: target.modelSpendUsd, modelSpend8dUsd: spend8 }, null, 1));
    return;
  }
  console.log(`Funnel for ${target.day} (UTC) vs the 7 days before it. Source: ${source}\n`);
  console.log(`${"".padEnd(26)}${"day".padStart(8)}${"7-day avg".padStart(12)}`);
  for (const row of rows) console.log(`${row.step.padEnd(26)}${String(row.day).padStart(8)}${String(row.avg7).padStart(12)}`);
  console.log(`\nModel spend: $${target.modelSpendUsd.toFixed(2)} that day, $${spend8.toFixed(2)} over the 8 days.`);
  if (pages.length) {
    console.log(`\n${"page".padEnd(30)}${"visits".padStart(8)}${"uploads".padStart(9)}${"ok".padStart(6)}${"dl".padStart(6)}${"emails".padStart(8)}${"leads".padStart(7)}`);
    for (const p of pages) {
      console.log(
        `${p.page.padEnd(30)}${String(p.visits).padStart(8)}${String(p.uploads).padStart(9)}${String(p.ok).padStart(6)}${String(p.downloads).padStart(6)}${String(p.emails).padStart(8)}${String(p.leads).padStart(7)}`,
      );
    }
  }
}

main().catch((error) => {
  console.error(`metrics unavailable: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
