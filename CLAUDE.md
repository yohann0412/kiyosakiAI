# Agent instructions

This repo is one program: a free document-to-spreadsheet tool with search
pages around it, run as a nightly research loop. **Read `program.md` first.**
It is the brief, and the human owns it.

## Who edits what

| File or folder | Owner | The agent may |
| -------------- | ----- | ------------- |
| `program.md`, `offer.md` | Human | Read. Propose changes in the morning report. Never edit. |
| `eval/` | Human | Read and run. **Never edit, add or delete anything.** `npm run eval:guard` must pass. |
| Everything else | Agent | Edit freely within the permissions in `program.md`. |

## The nightly cycle

"Read program.md, lab_notebook.md and results.tsv. Run tonight's cycle." means:

1. **Read** `program.md`, `lab_notebook.md`, `results.tsv`, and the last report in `reports/`.
2. **Health check**: `npm ci && npm run check` (types, tests, eval seal). Fix anything red before experimenting.
3. **Numbers**: `npm run metrics` (yesterday vs the 7-day average) and `npm run leads:sync`. If they fail because credentials are missing, say so in the report; do not invent numbers.
4. **Close open experiments** whose stop rule has been reached: record the result in `results.tsv`, keep or revert, note it in the notebook.
5. **Pick or propose one experiment**: one hypothesis, one change. Take it from the backlog in `lab_notebook.md` or add your own.
6. **Write the stop rule in `lab_notebook.md` before changing anything.**
7. **Run it.** For anything touching `core/extractor/`: `npm run eval` before and after, both numbers in `results.tsv`. Keep only if accuracy did not drop.
8. **Ship**: `npm run check && npm run build`, commit, deploy (see below).
9. **Write the morning report** `reports/YYYY-MM-DD.md` in the format at the end of `program.md`. One screen, plain English, counts not adjectives.

Traffic is small at first. Do not run A/B splits until a page gets enough
visits to tell a difference; test one change after another and say so in the
report. Do not judge a search page before it is 4 to 6 weeks old.

## Hard rules (from program.md)

Never:

- keep an uploaded document past the stated 24 hours, or use one for anything else (training, demos, examples, debugging, eval);
- claim customers, accuracy figures or results we do not have;
- write fake reviews or testimonials;
- publish keyword-stuffed, auto-spun or thin pages;
- edit anything in `eval/`.

Ask first (put it in "What I need you to approve" and wait): paid ads, a new
domain, any email to users beyond the one confirmation email, any change to
how uploaded data is stored or used.

Uploads are processed in memory and never written to disk or to the store. If
a change would stage a file anywhere, that is a change to how uploaded data is
stored: ask first.

## Where things live

- `core/extractor/` shared extractor (Demo Forge uses it too). `prompt.ts` holds the prompt and `PROMPT_VERSION`; bump the version whenever the prompt or schema changes. `doctypes.ts` is the catalog of fields and columns per document type. `checks.ts` is the arithmetic done in code.
- `content/tuning.ts` the knobs: free-document limit, daily limits, budget, lead-button and gate wording.
- `content/pages.ts` the search pages. The rules for adding one are at the top of that file.
- `app/api/` the endpoints: `extract`, `email`, `lead`, `event`, `session`, `admin/*`, `cron/purge`.
- `lib/` storage, limits, events, leads, alerts, metrics.
- `scripts/` eval runner and scorer, metrics, lead sync, sample builder, document generator.
- `public/samples/` sample documents and the converter's saved real output for them (`npm run samples`).
- `leads/inbound.csv` rebuilt by `npm run leads:sync`; personal data, gitignored.

## Commands

```
npm run dev            local site (set EXTRACTOR_PROVIDER=mock to work without a model key)
npm run check          typecheck + unit tests + eval seal
npm run build          production build
npm run eval           accuracy on eval/golden_docs (costs money; prints the total)
npm run eval -- --model claude-haiku-5-5 --label "what changed"
npm run metrics        funnel, yesterday vs 7-day average
npm run leads:sync     rebuild leads/inbound.csv from production
npm run samples        re-render sample documents and re-run the real converter on them
```

`npm run samples` and the document generator need Playwright with Chromium.
In the cloud container it is installed globally: prefix with
`NODE_PATH=$(npm root -g)`.

## Budget

$50 a month for hosting plus model calls. The site stops converting for the
day when model spend reaches `dailyBudgetUsd` in `content/tuning.ts`. A full
eval run is a few cents to a couple of dollars depending on the model; count
it against the month and record the cost in `results.tsv`.

## Deploying

See the "Deploying" section of `README.md` for the current setup. Production
is allowed without asking (program.md). Always run `npm run check` and
`npm run build` first, and load the live site after a deploy to confirm an
upload still works.
