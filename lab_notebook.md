# Lab notebook

The agent's working log. Newest entry first. Every experiment gets an entry
**before** it starts (hypothesis, the one change, the stop rule) and a result
when it stops. Numbers also go in `results.tsv`.

Entry template:

```
## YYYY-MM-DD  E###  Short name
Hypothesis:  what I expect and why
Change:      the one thing that changes
Stop rule:   when I stop and what decides keep or revert (written before starting)
Result:      what happened (counts, cost)
Decision:    keep | revert | inconclusive, and what follows
```

---

## Backlog

Ordered by what I would run next. One per night.

### Fast loop

| id | Experiment | Hypothesis | Stop rule |
| -- | ---------- | ---------- | --------- |
| E001 | **Accuracy baseline and model choice.** Run the eval on `claude-opus-5-5`, `claude-sonnet-5-5` and `claude-haiku-5-5` at effort `low`. | The default (Opus 5.5) is the most accurate; a cheaper model may be within a point of it. At $50 a month the difference is roughly 20 documents a day against several hundred. | One full run per model. Report accuracy, cost per document and seconds per document. **The model is the human's call** (see report); I recommend, they decide. |
| E002 | Effort `low` vs `medium` on the chosen model. | Medium helps the hard documents (fax, messy handwriting) more than it costs. | One run each. Keep medium only if accuracy rises by 1 point or more and mean time stays under 25 s. |
| E003 | Second look at rows that fail an arithmetic check: re-ask the model about only those rows, with the check's message. | Recovers misread digits on photos and faxes at a small extra cost, only when a check fails. | Eval before and after. Keep if hard-document accuracy rises and no document gets worse. |
| E004 | Prompt: tell the model the column sums it should expect to reconcile, without letting it "fix" numbers. | Fewer dropped rows on long tables. | Eval before and after; revert on any drop. |
| E005 | Free limit 3 vs 10 documents before the email gate. | 10 gets more people to a second session; 3 captures more emails per visitor. Unknown which yields more leads. | Sequential, two weeks each, only once there are at least 200 uploaders a fortnight. Metric: emails and lead forms per 100 uploaders. |
| E006 | Lead button wording: current line vs one naming the document ("A stack of bills of lading every day?"). | Naming the document raises clicks from tuned pages. | Sequential, until 300 successful extractions per arm. Metric: `cta_click` per successful extraction, then leads. |
| E007 | Offer button placement: under the result (now) vs also in the download confirmation. | The moment after the first download is when the tool has proved itself. | Same as E006. |
| E008 | QuickBooks-style export for invoices, with a page for "invoice to QuickBooks". | Research found real demand (Intuit community threads: QuickBooks will not take PDFs). | Needs the import columns verified against Intuit's current documentation first; the research could not open those pages. Do not publish the page until the export is built and tested against a real import. |
| E009 | HEIC photos: convert in the browser instead of asking the user to re-save. | Removes a dead end for iPhone users on desktop Chrome. | Ship if it adds under 150 KB, lazy-loaded. Watch `extract_fail` by reason. |
| E010 | Show rows as they are read (streaming) instead of a spinner. | Shorter perceived wait; fewer abandoned uploads. | Metric: `extract_ok` per `upload`. |

### Slow loop

| id | Experiment | Notes |
| -- | ---------- | ----- |
| S001 | Which pages earn their place. | Judge each page at 4 to 6 weeks on Search Console impressions and clicks, then on uploads and leads per visit. Needs Search Console access (asked for in the report). |
| S002 | Candidate pages with some evidence: delivery note to Excel, commercial invoice to Excel, order form to Excel, freight invoice to Excel. | Each needs its own example and its own limits section, or it is a thin page. One at a time. |
| S003 | Candidates I decided against for now: "image to Excel" and "scanned PDF to Excel". | Huge demand but generic, and owned by Adobe, Smallpdf and iLovePDF. Visitors there are less likely to have daily paperwork. Revisit if the tuned pages rank. |
| S004 | Industry pages (restaurant invoices, construction invoices, freight audit). | The research found only weak evidence. Wait for query data from Search Console before writing any. |
| S005 | A real-document eval set. | The current golden set is synthetic. Ten to twenty real, redacted documents from the human would make the accuracy number mean much more. |

---

## 2026-11-17  E000  Day 0: build

**What exists now**

- `core/extractor/`: Claude vision with structured output, a catalog of six
  document types, post-processing, arithmetic checks in code, recovery from
  cut-off responses, a cost model. 58 unit tests on the pure parts.
- The tool: upload (PDF, photo, paste, phone camera) → editable table beside
  the document → Excel (line items, details, import-ready sheets), three CSV
  layouts, copy for Google Sheets. Photos are shrunk in the browser; PDFs over
  the host's 4.5 MB request limit are turned into page images in the browser.
- Limits: 3 free documents, then an email (25 a day); bulk needs an email;
  per-IP and per-minute caps; a daily model budget (default $1.50) that closes
  the tool for the day when reached.
- Lead form (volume, documents, current process, email) → store →
  `leads/inbound.csv`, with alert hooks for email and webhook.
- Seven search pages plus the home page, each with its own limits section,
  FAQ and structured data.
- Eval: 19 golden documents (sealed), a scorer, `npm run eval`.
- Nightly tooling: `npm run metrics`, `npm run leads:sync`, `npm run check`.

**Decisions and why**

- *Uploads are never stored.* They are read in memory and dropped. This is
  stricter than "deleted after 24 hours" and the site says both. It also means
  there is nothing to purge; the hourly sweep is a backstop.
- *Pages chosen on evidence* (research in `content/pages.ts` `demand` notes).
  "Packing slip to CSV" showed no demand on its own, so CSV is covered on the
  packing slip page instead of a thin page of its own.
- *No accuracy figure anywhere on the site.* We do not have one that describes
  real documents.
- *Sample examples are gated on real output.* A page shows its "real example"
  only when `public/samples/<id>.json` exists, and that file is only ever
  written by running the real converter (`npm run samples`).
- *Storage is one small interface* (`lib/store`) with three drivers: local
  files, Vercel Blob, Supabase Storage. Counters are one object per event with
  the type in the key, so daily counts need one listing and no shared counter.
- *The eval set had to be bootstrapped by the agent* because the repo started
  empty. It is synthetic, sealed, and described honestly in `eval/README.md`.

**Not verified yet (no model key was available in the build session)**

- The prompt and the JSON schema have never been sent to the live API. The
  SDK types accept them and the flow works end to end with the mock provider,
  but the first real run may need fixes.
- No accuracy baseline. E001 is the first thing to run.
- The six sample outputs do not exist yet, so the pages have no "real example"
  block and should not be considered finished until `npm run samples` has run.

**Known weak spots**

- Per-IP counters are read-modify-write on an object store: two simultaneous
  uploads from one IP can undercount by one. Fine for abuse control, not exact.
- The golden set's handwriting comes from fonts. Real handwriting is harder.
- The privacy and terms pages are plain-English drafts, not legal review.
- The site name "Sheetlift" is a placeholder (`SITE_NAME`).
