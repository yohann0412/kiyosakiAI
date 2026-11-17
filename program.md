# Free Tool + Search Pages — program.md

Leads that come to us while nobody is sending anything.

## How to run this

- Put this file in the repo as `program.md`. **The human edits this file. The agent edits the code.**
- A nightly scheduled job starts a coding agent in headless mode: "Read program.md, lab_notebook.md and results.tsv. Run tonight's cycle."

## What this is

A free web tool: upload a photo or PDF of a business document (invoice, packing slip, bill of lading, purchase order, receipt, handwritten order) and get a clean spreadsheet back.

Around it, build pages that each match one exact search people make, like "bill of lading to Excel" or "packing slip to CSV."

Anyone who uses the tool has shown they have this paperwork. The offer to them: **"Doing 50 of these a day? We'll handle all of them for you."**

## Why this agent gets the most freedom

Nothing here contacts a person. Visitors come to us, and the feedback (visits, uploads, sign-ups) is automatic. That makes it the closest thing to a true autonomous research loop, so you may build, deploy and experiment on your own within budget.

## Build

1. **The core tool:** upload → extract → editable table → download CSV or Excel.
   - The first few documents need no sign-up. Bulk use or saving results needs an email.
   - Uploads are deleted after 24 hours, and the page says so.
   - Use the shared extractor in `core/extractor/` (Demo Forge uses it too, so an accuracy gain helps both).
2. **Search pages:** one per document type × output format × industry, but only where people actually search for it.
   - Each page needs a working tool tuned for that document type, a real example and an honest explanation.
   - **No thin pages.** Google penalizes mass-produced pages that add nothing. If a page can't be genuinely useful, don't publish it.
3. **Lead capture:** a "Process these every day? We'll do it for you" button leads to a short form asking about volume, document type and their current process. It writes to `leads/inbound.csv` and alerts Yohann.

## Metrics

**North star:** qualified inbound leads per week (form filled in and volume above a threshold set in `offer.md`).

**Funnel:** visits → uploads → successful extractions → downloads → emails captured → lead forms.

**Quality:** extraction accuracy on `eval/golden_docs/`. **You may not edit anything in `eval/`.**

**Search:** impressions, clicks and ranking per page, from Google Search Console. These move over weeks, so **don't judge a page before 4–6 weeks.**

## The nightly loop

1. Read `program.md`, `lab_notebook.md` and `results.tsv`.
2. Pick or propose one experiment, with one hypothesis and one change.
3. Write the stop rule before you start.
4. Run it, then log the hypothesis, the change, traffic, cost and results.
5. Keep or revert. Write the morning report.

## Experiments (free rein within budget)

**Fast loop (days):**
- Extraction accuracy: run `eval/` before and after every change
- Tool usability: steps to first download, error messages, speed
- The free limit: 3 vs 10 documents before asking for an email
- Wording and placement of the lead-capture button
- Output formats: CSV, Excel, Google Sheets, or straight into QuickBooks-style templates

**Slow loop (weeks):**
- Which document types and industries deserve pages
- Page layout templates
- Which pages bring leads, not just visits

Only run true A/B splits where traffic is big enough to tell a difference. Otherwise test one change after another, and say so in the report.

## Permissions

**Allowed without asking:** build, deploy to production on our domain, create and delete pages, change wording and the tool, run A/B tests, and spend within budget.

**Ask first:** paid ads, a new domain, any email to users beyond the one confirmation email, or any change to how uploaded data is stored or used.

**Never:**
- Keep uploaded documents past the stated window, or use them for anything else (training, demos, examples)
- Claim customers or results we don't have
- Write fake reviews or testimonials
- Publish keyword-stuffed or auto-spun pages
- Edit anything in `eval/`

## Budget

- $50 per month for hosting plus model calls to start.
- Set a cost cap per upload, and rate-limit by IP to stop abuse.

## Morning report: `reports/YYYY-MM-DD.md`

One screen, in plain English:
1. Traffic, uploads, emails and leads yesterday vs the 7-day average (counts)
2. What I changed and what happened
3. New pages published, and pages removed
4. Accuracy score on `eval/` (only if it changed)
5. What I need you to approve (yes/no)
