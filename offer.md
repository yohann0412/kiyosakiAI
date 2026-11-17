---
# Machine-read settings. The site and the lead form read these at build time.
# The human owns this file; the agent proposes changes in the morning report.
qualified_min_docs_per_day: 50
---

# Offer

> **Doing 50 of these a day? We'll handle all of them for you.**

## Who it is for

Operations, accounts-payable and logistics teams that re-type the same kinds of
paperwork every day: supplier invoices, packing slips, bills of lading,
purchase orders, receipts and handwritten order forms.

## What we do

We take the documents as they arrive (email, scan, phone photo), turn every one
into clean rows, check the arithmetic, and deliver them in the format the
team's system imports: Excel, CSV, Google Sheets, or an accounting / ERP import
file.

## What counts as a qualified lead

A lead is **qualified** when the form is filled in with a working email and the
stated volume is at or above `qualified_min_docs_per_day` (set at the top of
this file). The volume buckets on the form are:

| Bucket on the form | Counted as (docs/day) | Qualified at threshold 50 |
| ------------------ | --------------------- | ------------------------- |
| Fewer than 10      | 5                     | no                        |
| 10 to 49           | 10                    | no                        |
| 50 to 199          | 50                    | yes                       |
| 200 or more        | 200                   | yes                       |

## What we do not promise

No customer names, case studies, accuracy percentages or turnaround times
appear on the site until they are real and written into this file.
