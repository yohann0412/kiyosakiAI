# Free tool + search pages

A free web tool that turns a photo or PDF of a business document (invoice,
packing slip, bill of lading, purchase order, receipt, handwritten order) into
a clean spreadsheet, with search pages around it and an offer behind it:
**"Doing 50 of these a day? We'll handle all of them for you."**

`program.md` is the brief. The human edits it; the agent edits the code and
runs a nightly loop against it (`CLAUDE.md` says how).

## What is in the box

| Path | What |
| ---- | ---- |
| `program.md`, `offer.md` | The brief and the offer (human-owned) |
| `lab_notebook.md`, `results.tsv`, `reports/` | The loop's memory: experiments, numbers, morning reports |
| `core/extractor/` | Shared extractor (also used by Demo Forge) |
| `app/`, `components/`, `lib/` | The Next.js site: tool, pages, API |
| `content/pages.ts` | The search pages |
| `content/tuning.ts` | Limits and wording the loop experiments with |
| `eval/` | 19 golden documents with expected output (frozen) |
| `scripts/` | Eval, metrics, lead sync, sample builder |
| `leads/` | `inbound.csv` (gitignored; rebuilt from the store) |

## Run it locally

```bash
npm install
cp .env.example .env.local        # then fill in ANTHROPIC_API_KEY
npm run dev                       # http://localhost:3000
```

No model key yet? `EXTRACTOR_PROVIDER=mock npm run dev` runs the whole product
on canned sample data (the result is labelled "Demo mode").

```bash
npm run check      # types, unit tests, eval seal
npm run eval       # accuracy on the golden set (uses the model; prints the cost)
```

## How a conversion works

1. The browser shrinks photos and, for PDFs too big for one request, renders
   the pages to images.
2. `POST /api/extract` checks the limits, reads the file **in memory**, and
   calls the extractor. The file is never written to disk or to the store.
3. The extractor sends the document to Claude with a JSON schema, cleans the
   result, and runs arithmetic checks in code.
4. The table goes back to the browser, where it is edited and where the Excel
   and CSV files are built.

## Limits and cost control

All in `content/tuning.ts`:

- 3 free documents per browser, then an email (25 a day). Bulk needs an email.
- Per-IP caps per minute and per day.
- **Per-upload cost cap**: at most 10 pages and 16,000 output tokens per
  document (`extractorConfig().costCapUsd` gives the dollar figure for the
  configured model).
- **Daily model budget**: `dailyBudgetUsd` (default $1.50, about $45 a month).
  When the day's spend reaches it the tool closes until midnight UTC and
  offers the lead form instead.

## Data handling

- Uploads: processed in memory, discarded when the request ends. Nothing from
  an upload is kept past 24 hours; in practice nothing is kept at all.
- Stored: funnel events (no content), captured emails, lead forms, short-lived
  usage counters keyed by a hash of the IP.
- The document is sent to Anthropic's API to be read. Anthropic does not train
  on API data; its own retention applies. The privacy page says this.

## Deploying

The site is a standard Next.js app and is set up for Vercel.

1. Create a Vercel project from this repo (framework: Next.js, root: `/`).
2. Storage: connect a **Vercel Blob** store to the project (it sets
   `BLOB_READ_WRITE_TOKEN`), or set `STORE_DRIVER=supabase` with
   `STORE_SUPABASE_URL` and `STORE_SUPABASE_KEY` for a Supabase project.
3. Environment variables (see `.env.example`):
   - `ANTHROPIC_API_KEY` (required)
   - `APP_SECRET` (required; `openssl rand -base64 32`)
   - `CRON_SECRET` (required for the hourly retention sweep)
   - `ADMIN_TOKEN` (lets `npm run metrics` and `npm run leads:sync` read production)
   - `SITE_URL` once there is a domain
   - optional: `RESEND_API_KEY`, `EMAIL_FROM`, `ALERT_EMAIL_TO`, `ALERT_WEBHOOK_URL`
4. Deploy. `vercel.json` schedules the hourly sweep.
5. Run `npm run samples` once with the key set, and commit `public/samples/*.json`,
   so each page shows its real example.

Without a persistent store the app refuses to start on Vercel rather than
silently losing leads.

## Lead alerts

A new lead is saved first, then announced on every configured channel:

- **Email** via Resend (`RESEND_API_KEY`, `EMAIL_FROM`, `ALERT_EMAIL_TO`). The
  reply-to is the lead's address, so answering the alert emails the person
  directly.
- **Webhook** (`ALERT_WEBHOOK_URL`): a Slack or Discord incoming webhook.

The `alerted` column in `leads/inbound.csv` shows which channels fired.

## The nightly loop

```bash
scripts/nightly.sh
```

starts a headless agent with: "Read program.md, lab_notebook.md and
results.tsv. Run tonight's cycle." `CLAUDE.md` defines the cycle.
