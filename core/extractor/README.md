# core/extractor

Shared document extractor: a photo or PDF of a business document in, typed
fields and tables out. The free tool and Demo Forge both use it, so an
accuracy gain here helps both.

```ts
import { extractDocument } from "@/core/extractor";

const result = await extractDocument({
  inputs: [{ data: bytes, mediaType: "application/pdf" }], // one PDF, or one image per page
  hint: "invoice", // or "auto"
});

result.docType;      // "invoice"
result.fields;       // [{ key: "invoice_number", label: "Invoice number", value: "INV-20418", type: "text" }, ...]
result.tables[0];    // { name: "Line items", columns: [...], rows: [["BX-1208", "Corrugated box...", "500", ...]], flags: [...] }
result.checks;       // [{ id: "line_sum", ok: true, message: "Line amounts add up to the subtotal (1522.50)" }]
result.usage;        // { model, inputTokens, outputTokens, costUsd, ms }
```

Server-side only: it calls the model API. Browser code imports the pure
modules directly (`./types`, `./doctypes`, `./tabular`, `./normalize`,
`./checks`).

## How it works

1. **Prepare** (`pdf.ts`): count PDF pages, keep the first `maxPages`.
2. **Read** (`providers/anthropic.ts`): one request to Claude with the document
   and a JSON schema (structured output). The prompt and schema are in
   `prompt.ts`; the catalog of fields and columns per document type is in
   `doctypes.ts`.
3. **Clean** (`postprocess.ts`): catalog keys and labels, rectangular tables,
   plain-decimal numbers, ISO dates, flags attached to the right cells.
4. **Check** (`checks.ts`): arithmetic in ordinary code: quantity × price,
   column sums against the subtotal, subtotal + tax + charges against the
   total, freight totals. Checks never change a value; they flag.

Values are always strings. Numbers and money are plain decimals (`"1234.50"`),
dates are `YYYY-MM-DD`, empty is `""`.

## Configuration

| Env var | Default | Meaning |
| ------- | ------- | ------- |
| `ANTHROPIC_API_KEY` | none | Required for real extraction |
| `EXTRACTOR_MODEL` | `claude-opus-5-5` | Any current Claude model id |
| `EXTRACTOR_EFFORT` | `low` | `low` to `max`; more effort costs more and is slower |
| `EXTRACTOR_MAX_PAGES` | `10` | Pages read per document (cost cap) |
| `EXTRACTOR_MAX_OUTPUT_TOKENS` | `16000` | Output ceiling per document (cost cap) |
| `EXTRACTOR_PROVIDER` | `anthropic` | `mock` returns canned sample data for local development only |

`extractorConfig().costCapUsd` is the most a single upload can cost at list
prices with those caps.

## Changing it

- Bump `PROMPT_VERSION` in `prompt.ts` whenever the prompt or schema changes.
- Run `npm run eval` before and after, and record both in `results.tsv`.
- Renaming a catalog key breaks exports, bulk merges and the eval's expected
  values. Add keys freely; rename only with every consumer.
- `npm test` covers the pure parts (number and date parsing, truncated-JSON
  recovery, post-processing, checks, exports).

## Errors

`extractDocument` throws `ExtractorError` with a `code` and a `userMessage`
that is safe to show to an end user:
`not_configured`, `unsupported_file`, `unreadable_file`, `too_many_pages`,
`refused`, `empty_result`, `provider_error`, `rate_limited`, `timeout`.
