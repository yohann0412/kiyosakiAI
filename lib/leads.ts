import { promises as fs } from "node:fs";
import path from "node:path";
import { LEAD_CSV_HEADER, leadCsvRow, type Lead } from "./leads-csv";
import { putJson, store } from "./store";

export const LEADS_CSV_PATH = path.join(process.cwd(), "leads", "inbound.csv");

/**
 * Save a lead. The store is the source of truth. With the local file store
 * (development, or a single long-running server) the lead is also appended
 * straight to leads/inbound.csv; on serverless hosts there is no writable
 * disk, so `npm run leads:sync` rebuilds the CSV from the store.
 */
export async function saveLead(lead: Lead): Promise<void> {
  await putJson(`leads/${lead.id}.json`, lead);
  if (store().kind === "fs") await appendLeadCsv(lead);
}

async function appendLeadCsv(lead: Lead): Promise<void> {
  await fs.mkdir(path.dirname(LEADS_CSV_PATH), { recursive: true });
  let exists = true;
  try {
    await fs.access(LEADS_CSV_PATH);
  } catch {
    exists = false;
  }
  await fs.appendFile(LEADS_CSV_PATH, (exists ? "" : LEAD_CSV_HEADER) + leadCsvRow(lead), "utf8");
}

export async function allLeads(): Promise<Lead[]> {
  const objects = await store().list("leads/");
  const leads: Lead[] = [];
  for (const object of objects) {
    const text = await store().get(object.key);
    if (!text) continue;
    try {
      leads.push(JSON.parse(text) as Lead);
    } catch {
      // skip a corrupt record rather than fail the export
    }
  }
  return leads.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function writeLeadsCsv(leads: Lead[]): Promise<void> {
  await fs.mkdir(path.dirname(LEADS_CSV_PATH), { recursive: true });
  await fs.writeFile(LEADS_CSV_PATH, LEAD_CSV_HEADER + leads.map(leadCsvRow).join(""), "utf8");
}
