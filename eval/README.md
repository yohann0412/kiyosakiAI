# eval/

The yardstick for extraction accuracy. **Frozen: the agent may not edit
anything in this folder** (see `program.md`). `npm run eval:guard` fails if any
file here changes.

## What is here

- `golden_docs/<id>/document.pdf` or `document.jpg`: the file a user would upload.
- `golden_docs/<id>/expected.json`: what the converter should return for it
  (header values by catalog key, and the table rows).
- `source/golden-defs.ts`: the definitions the documents were rendered from.
- `MANIFEST.sha256`: the seal (a hash of every file here).

## Where the 19 documents came from

The repo started empty on 2026-11-17, and the nightly loop needs a fixed
yardstick from day one. So the first golden set was **generated once** by
`scripts/gen-golden.ts`: each document is rendered from a definition, which
makes the expected values exact by construction.

They cover six document types and four ways a document reaches the tool:

| Capture | What it simulates |
| ------- | ----------------- |
| pdf     | a digital PDF with a text layer |
| scan    | a flatbed scan: skew, noise, soft focus, JPEG artefacts |
| fax     | black and white, low resolution, specks |
| photo   | a phone photo at an angle, uneven light, shadow |

and specific traps: tables across pages, no ruling lines, per-line discounts,
European number and date formats, negative lines, blank backorder cells,
columns outside the catalog, a second table on a bill of lading, a handwritten
correction over a printed weight, faded thermal print, a handwritten tip and
total, ditto marks, a crossed-out row, and forms with no prices to check.

## What this set cannot tell you

These are synthetic documents with made-up companies. Handwriting is rendered
from handwriting fonts, which is much tidier than real handwriting. Real
paperwork is messier than anything here, so **a high score on this set is a
floor to hold, not proof the tool is accurate on your customers' documents.**

## For the human: making it better

Replace or add to the set with real, redacted documents:

1. Create `golden_docs/<id>/` with the file(s) and an `expected.json` in the
   same shape as the existing ones (`files`, `docType`, `fields`, `tables`).
2. Run `npm run eval:guard -- --reseal` (it refuses to run inside an agent
   session).
3. Note the change in `lab_notebook.md`: scores before and after a change of
   golden set are not comparable.

Never put a visitor's upload in here. Uploads are not kept and are not used
for anything but producing that visitor's spreadsheet.
