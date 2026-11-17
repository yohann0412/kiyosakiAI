/**
 * Rebuild leads/inbound.csv from the production store.
 *
 *   npm run leads:sync
 *
 * The CSV holds personal data and is gitignored. Reads the live site when
 * SITE_URL and ADMIN_TOKEN are set, otherwise the configured store.
 */
import { LEADS_CSV_PATH, allLeads, writeLeadsCsv } from "@/lib/leads";
import type { Lead } from "@/lib/leads-csv";
import { remoteConfigured, remoteGet } from "./remote";

async function main() {
  const leads = remoteConfigured() ? (await remoteGet<{ leads: Lead[] }>("/api/admin/leads")).leads : await allLeads();
  await writeLeadsCsv(leads);
  const qualified = leads.filter((lead) => lead.qualified).length;
  console.log(`${leads.length} lead${leads.length === 1 ? "" : "s"} (${qualified} qualified) written to ${LEADS_CSV_PATH}`);
}

main().catch((error) => {
  console.error(`lead sync failed: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
