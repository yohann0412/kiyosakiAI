# leads/

`inbound.csv` is where the "Process these every day? We'll do it for you" form
ends up: one row per submission.

| Column | Meaning |
| ------ | ------- |
| `id`, `created_at` | Unique id and UTC timestamp |
| `email`, `name`, `company` | Who to reply to (name and company are optional on the form) |
| `doc_type` | Which documents they handle |
| `volume`, `docs_per_day` | The bucket they picked, and the lower bound we count it as |
| `current_process` | How the documents are handled today |
| `notes` | Anything else they wrote |
| `source_page` | The page the form was opened from |
| `docs_converted` | How many documents they had converted before filling in the form |
| `qualified` | `true` when `docs_per_day` is at or above the threshold in `offer.md` |
| `alerted` | Which alert channels fired (`email`, `webhook`), blank if none is configured |

## How rows get here

- **Locally** (file store): the form appends to `inbound.csv` directly.
- **In production** there is no writable disk, so the lead is saved to the
  store and `npm run leads:sync` rebuilds this file from it. The nightly cycle
  runs that every night.

## Why the CSV is not in git

It holds names and email addresses. `.gitignore` keeps it out so that lead
data does not end up in repository history. The store is the source of truth;
this file can always be rebuilt.

Cells that start like a spreadsheet formula get an apostrophe in front, so a
hostile form entry cannot run a formula when the file is opened in Excel.
