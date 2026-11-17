import type { DocTypeHint, DocTypeId } from "@/core/extractor/types";
import { tuning } from "./tuning";

/**
 * The search pages. One entry per exact search people make.
 *
 * Rules (from program.md):
 *  - Only add a page where there is evidence people search for it. Put the
 *    evidence in `demand`.
 *  - Every page needs a working tool tuned for its document type, a real
 *    example (the sample is the converter's actual output, see
 *    scripts/make-samples.ts) and an honest explanation, including limits.
 *  - No thin pages. If you cannot write something specific and useful that is
 *    not already on a sibling page, do not publish the page.
 *  - Never claim customers, accuracy figures or results we do not have.
 *
 * Copy may use {free}, {daily}, {pages} and {bulk}; they are filled in from
 * content/tuning.ts so the text never disagrees with the limits.
 */

export type Block =
  | { kind: "prose"; heading: string; paragraphs: string[] }
  | { kind: "list"; heading: string; intro?: string; items: { title?: string; text: string }[] }
  | { kind: "catalog"; heading: string; intro?: string; docType?: DocTypeId }
  | { kind: "steps"; heading: string; steps: { title: string; text: string }[] }
  | { kind: "table"; heading: string; intro?: string; columns: string[]; rows: string[][]; note?: string }
  | { kind: "example"; heading: string; intro?: string };

export interface ToolPage {
  slug: string;
  /** Short label for the header navigation. */
  nav: string;
  docType: DocTypeHint;
  title: string;
  description: string;
  h1: string;
  /** One line for cards and link lists. */
  blurb: string;
  intro: string;
  /** The exact search this page answers. */
  keyword: string;
  /** Why we believe people search for it (not rendered). */
  demand: string;
  /** Sample document shown as the real example and offered in the tool. */
  sample?: { id: string; label: string };
  blocks: Block[];
  faq: { q: string; a: string }[];
  related: string[];
  published: string;
  updated: string;
}

export function fill(text: string): string {
  return text
    .replace(/\{free\}/g, String(tuning.freeDocs))
    .replace(/\{daily\}/g, String(tuning.emailDailyDocs))
    .replace(/\{pages\}/g, "10")
    .replace(/\{bulk\}/g, String(tuning.bulkMaxFiles));
}

const PRIVACY_BLOCK: Block = {
  kind: "prose",
  heading: "What happens to your file",
  paragraphs: [
    "Your upload is read in memory and discarded as soon as the spreadsheet is ready. It is not written to our disks, and nothing from it is kept longer than 24 hours. The extracted table lives in your browser, which is also where the Excel and CSV files are built.",
    "To read the document we send it to an AI model run by Anthropic. Uploads are not used to train models, are not used for demos or examples, and are not looked at by us. The details, including the model provider's own retention, are on the [privacy page](/privacy).",
  ],
};

const FREE_FAQ = {
  q: "Is it really free?",
  a: "Yes. Your first {free} documents need no sign-up at all. After that we ask for a work email, which gives you {daily} documents a day. There is no watermark and no row limit. If you need more than that every day, we offer to run them for you, which is how this free tool pays for itself.",
};

const BULK_FAQ = (plural: string) => ({
  q: `Can I convert several ${plural} at once?`,
  a: `Yes. Select or drop up to {bulk} files together and you get one workbook: a summary sheet with one row per document, a sheet with every line from every document (with the file name and document number on each row), and a sheet per document. Bulk conversion asks for an email first.`,
});

export const PAGES: ToolPage[] = [
  // --------------------------------------------------------------------------
  {
    slug: "invoice-to-excel",
    nav: "Invoice",
    docType: "invoice",
    keyword: "invoice to excel",
    demand:
      "High. Dedicated pages from DocuClipper, Parseur, DigiParser, Affinda and Lido target the exact phrase; spam doorway pages chase 'invoice pdf to excel free'. Research 2026-11-17.",
    title: "Invoice to Excel Converter: PDF or Photo to XLSX, Free",
    description:
      "Upload a PDF, scan or photo of an invoice and get every line item, date and total as an editable Excel file. First {free} free with no sign-up. Files deleted within 24 hours.",
    h1: "Invoice to Excel",
    blurb: "Line items, dates and totals from a PDF or photo invoice, with the arithmetic checked.",
    intro:
      "Upload a PDF, scan or phone photo of an invoice. Get every line item in its own row, with the invoice number, dates and totals alongside, ready to download as .xlsx.",
    sample: { id: "invoice", label: "invoice" },
    blocks: [
      {
        kind: "example",
        heading: "A real example",
        intro: "This is a sample invoice and what the converter returned for it. Nothing here was typed in by hand.",
      },
      {
        kind: "catalog",
        heading: "What comes out of an invoice",
        intro:
          "Header values land on a Details sheet, line items on their own sheet. Only values that are actually on your invoice appear; nothing is invented to fill a column.",
      },
      {
        kind: "prose",
        heading: "Why invoices break ordinary PDF-to-Excel converters",
        paragraphs: [
          "General PDF converters rebuild the look of the page, not the data in it. That is why an invoice so often comes out as one long column, a grid of merged cells, or a table that stops at the bottom of page one. They have no idea that a row is a line item.",
          "This converter reads the document as an invoice. It finds the line-item table whether or not it has ruling lines, keeps a description that wraps over three printed lines in one cell, joins a table that continues across pages, and keeps subtotal, tax and total out of the rows. Numbers arrive as numbers, without currency symbols or thousands separators stored as text, and dates arrive as real dates.",
        ],
      },
      {
        kind: "list",
        heading: "It checks the arithmetic and shows you where it doesn't add up",
        intro:
          "After the invoice is read, ordinary code (not the AI model) runs three checks. They are how a 7 misread as a 1 gets caught before it reaches your books.",
        items: [
          { title: "Row by row", text: "Quantity × unit price is compared with the line amount. A row that doesn't multiply out is highlighted." },
          { title: "Down the column", text: "The line amounts are added up and compared with the invoice's subtotal." },
          { title: "At the bottom", text: "Subtotal, tax, shipping and discount are compared with the total." },
          {
            title: "No silent fixes",
            text: "When something doesn't reconcile, the converter tells you and leaves the values as read. Sometimes the invoice itself is wrong, and you want to know that too.",
          },
        ],
      },
      {
        kind: "steps",
        heading: "How to convert an invoice to Excel",
        steps: [
          { title: "Upload the invoice", text: "Drop a PDF, or a JPG or PNG photo or scan. On a phone you can take the photo straight from the upload button." },
          {
            title: "Check the highlighted cells",
            text: "Anything the converter wasn't sure of, or that fails an arithmetic check, is tinted. Click a cell to correct it, with the original document beside the table.",
          },
          {
            title: "Download",
            text: "The Excel file has a Line items sheet, a Details sheet, and an Import-ready sheet with one row per line and the invoice number, date and vendor repeated on each. CSV and copy-paste for Google Sheets are there too.",
          },
        ],
      },
      {
        kind: "list",
        heading: "Where it struggles",
        intro: "An AI model is reading your invoice, and it can be wrong. These are the cases to watch.",
        items: [
          { text: "**Long invoices.** One upload covers the first {pages} pages. Split longer files and convert the parts." },
          { text: "**Faint or low-resolution scans.** Dot-matrix carbon copies, worn thermal print and blurry photos produce flagged or empty cells rather than confident guesses." },
          { text: "**Ambiguous dates.** 03/04/2026 is March in one country and April in another. The converter decides from the addresses and other dates on the invoice, and flags the value when it had to choose." },
          { text: "**Tax-inclusive prices and unusual discounts.** The arithmetic checks assume the common layouts. An invoice with per-line tax folded into the amount can raise a warning even when every number was read correctly." },
          { text: "**Statements and remittance advices.** A page listing many invoices is treated as one document, which is rarely what you want." },
          { text: "**Other languages.** Text is kept exactly as written and not translated. We test mostly on English-language invoices, so check other languages with extra care." },
        ],
      },
      PRIVACY_BLOCK,
    ],
    faq: [
      FREE_FAQ,
      {
        q: "Does it work on scanned invoices and phone photos?",
        a: "Yes. It reads the image itself, so it does not need a PDF with selectable text. Skewed, creased and stamped pages are normal input. A sharp, evenly lit photo with the whole page in frame gives the best result.",
      },
      BULK_FAQ("invoices"),
      {
        q: "Will each line item be in its own row?",
        a: "Yes. That is the main thing it is built to get right, including descriptions that wrap over several lines and tables that run across pages.",
      },
      {
        q: "Can I import the result into my accounting software?",
        a: "The Import-ready layout (in the Excel file and as a CSV) has one row per line item with the invoice number, dates, vendor and customer repeated on every row, which is the shape accounting and ERP imports generally expect. You will still map the columns in your own system. See [invoice to CSV](/invoice-to-csv) for the details.",
      },
      {
        q: "What if a number is wrong?",
        a: "Click the cell and fix it; the document is shown next to the table for that reason. Your corrections are what gets downloaded, and the arithmetic checks re-run as you type.",
      },
    ],
    related: ["invoice-to-csv", "purchase-order-to-excel", "receipt-to-excel"],
    published: "2026-11-17",
    updated: "2026-11-17",
  },

  // --------------------------------------------------------------------------
  {
    slug: "invoice-to-csv",
    nav: "Invoice CSV",
    docType: "invoice",
    keyword: "invoice to csv",
    demand:
      "Medium. Parseur (/convert/invoice/to-csv), DigiParser (two pages) and WaveSpeed run dedicated pages. Distinct intent from the Excel page: people importing into software. Research 2026-11-17.",
    title: "Invoice to CSV: Convert PDF Invoices to Import-Ready CSV",
    description:
      "Turn a PDF or photo of an invoice into clean CSV: one row per line item, plain numbers, ISO dates, the invoice number on every row. First {free} free, no sign-up.",
    h1: "Invoice to CSV",
    blurb: "One row per line item with the invoice number on every row, ready for an import.",
    intro:
      "Turn a PDF, scan or photo of an invoice into a CSV your accounting system, ERP or script can import: one row per line item, plain numbers and unambiguous dates.",
    sample: { id: "invoice", label: "invoice" },
    blocks: [
      {
        kind: "prose",
        heading: "Two CSV layouts, because \"CSV\" means two different things",
        paragraphs: [
          "**Line items CSV** is the table as it appears on the invoice: SKU, description, quantity, price, amount. It is what you want for a quick look or a one-off paste.",
          "**Import-ready CSV** is what most software wants. Every row is one line item, and the invoice number, invoice date, due date, PO number, vendor and customer are repeated on every row, so the file still makes sense once it is sorted, filtered or merged with other invoices. Totals are deliberately not repeated: a total copied onto ten rows gets summed ten times by the first pivot table that meets it. Totals are in the separate Details CSV.",
        ],
      },
      {
        kind: "table",
        heading: "What the import-ready CSV looks like",
        intro: "An illustration of the layout, using three lines from one invoice:",
        columns: ["Invoice number", "Invoice date", "Due date", "PO number", "Vendor", "SKU", "Description", "Quantity", "Unit price", "Amount"],
        rows: [
          ["INV-20418", "2026-11-03", "2026-12-03", "PO-7731", "Northgate Packaging Supply", "BX-1208", "Corrugated box 12x8x6", "500", "0.84", "420.00"],
          ["INV-20418", "2026-11-03", "2026-12-03", "PO-7731", "Northgate Packaging Supply", "TP-220", "Packing tape 2in x 110yd", "36", "3.25", "117.00"],
          ["INV-20418", "2026-11-03", "2026-12-03", "PO-7731", "Northgate Packaging Supply", "SW-18", "Stretch wrap 18in x 1500ft", "24", "21.50", "516.00"],
        ],
        note: "You can rename or delete any column before downloading: click its header.",
      },
      {
        kind: "list",
        heading: "The CSV details that usually bite, and what this file does about them",
        items: [
          { title: "Numbers", text: "Plain decimals such as `1234.50`. No currency symbols, no thousands separators, a leading minus for credits. They parse as numbers everywhere." },
          { title: "Dates", text: "`YYYY-MM-DD`. It cannot be misread as day-first or month-first, and most importers accept it directly or let you pick it." },
          { title: "Commas and quotes in descriptions", text: "Quoted and escaped the standard way (RFC 4180), so `Bolt, hex 3/8\"` stays in one cell." },
          { title: "Accents and currency signs", text: "The file is UTF-8 with a byte-order mark, which is what makes Excel show `é` and `€` correctly. A few strict importers dislike the mark; if yours rejects the first column name, re-save the file as plain UTF-8." },
          { title: "Leading zeros", text: "A part number like `00412` is kept in the file. Excel drops the zeros if you open a CSV by double-clicking it. Use Data > From Text/CSV and set the column to Text, or take the Excel download instead." },
          { title: "Formula injection", text: "A cell that starts with `=`, `+`, `-` or `@` and is not a plain number gets an apostrophe in front, so a hostile document cannot plant a live formula in your spreadsheet." },
        ],
      },
      { kind: "catalog", heading: "Fields and columns you can expect", intro: "Only what is printed on the invoice appears in the file." },
      {
        kind: "steps",
        heading: "How to convert an invoice to CSV",
        steps: [
          { title: "Upload the invoice", text: "PDF, JPG, PNG or WebP. Scans and photos are fine." },
          { title: "Review", text: "Fix any highlighted cell. The arithmetic checks tell you whether the lines add up to the invoice total." },
          { title: "Open the CSV menu", text: "Choose Line items, Import-ready or Details. For several invoices, upload them together and download one combined CSV." },
        ],
      },
      {
        kind: "list",
        heading: "Where it struggles",
        items: [
          { text: "**Your importer's exact template.** Every system has its own required column names. This file has the right shape and clean values; you will still map or rename columns to match your system's template." },
          { text: "**Semicolon locales.** The delimiter is a comma. If your Excel expects semicolons, import through Data > From Text/CSV or use the Excel download." },
          { text: "**Reading errors.** An AI model reads the invoice and can misread a faint digit. The checks catch errors that break the arithmetic; a wrong PO number will not trip any check, so look at the highlighted cells and spot-check the rest." },
          { text: "**Long invoices.** The first {pages} pages per upload." },
        ],
      },
      PRIVACY_BLOCK,
    ],
    faq: [
      FREE_FAQ,
      { q: "Does the CSV have a header row?", a: "Yes, always. You can rename the headers before downloading by clicking them in the table." },
      {
        q: "Can I get one CSV for many invoices?",
        a: "Yes. Upload up to {bulk} invoices together and download one CSV with every line from every invoice, plus the file name and invoice number on each row. Columns are matched by meaning, so \"Qty\" on one supplier's invoice and \"Quantity\" on another's end up in the same column. Bulk conversion asks for an email first.",
      },
      {
        q: "Will my accounting system accept it?",
        a: "It is the usual one-row-per-line shape with clean numbers and ISO dates, which most imports can take once the columns are mapped. We do not promise a match to any particular product's template.",
      },
      { q: "Can I get Excel instead?", a: "Yes, the same result downloads as .xlsx. See [invoice to Excel](/invoice-to-excel)." },
    ],
    related: ["invoice-to-excel", "purchase-order-to-excel", "packing-slip-to-excel"],
    published: "2026-11-17",
    updated: "2026-11-17",
  },

  // --------------------------------------------------------------------------
  {
    slug: "bill-of-lading-to-excel",
    nav: "Bill of lading",
    docType: "bill_of_lading",
    keyword: "bill of lading to excel",
    demand:
      "Medium for the exact phrase (imagetotable, Parabola, FormX converter pages); high for 'bill of lading OCR' (Lido, Parseur, Nanonets, Klippa, Veryfi). Named in program.md. Research 2026-11-17.",
    title: "Bill of Lading to Excel: Convert a BOL Scan or PDF, Free",
    description:
      "Upload a scanned, faxed or photographed bill of lading and get shipper, consignee, carrier, PRO and every freight line (pieces, weight, NMFC, class) in Excel. First {free} free.",
    h1: "Bill of lading to Excel",
    blurb: "Shipper, consignee, carrier, PRO and every freight line with pieces, weight, NMFC and class.",
    intro:
      "Upload a scanned, faxed or photographed bill of lading. Get the shipper, consignee, carrier and reference numbers as fields, and every freight line with its handling units, packages, weight, NMFC and class as rows.",
    sample: { id: "bill-of-lading", label: "bill of lading" },
    blocks: [
      {
        kind: "example",
        heading: "A real example",
        intro: "A sample straight bill of lading and what the converter returned for it.",
      },
      {
        kind: "catalog",
        heading: "What gets pulled from a bill of lading",
        intro:
          "The fields follow the standard straight bill of lading (the VICS layout most U.S. LTL and truckload shipments use). Whatever else is printed and labelled comes through under its own name.",
      },
      {
        kind: "prose",
        heading: "Handling units and packages are separate columns, on purpose",
        paragraphs: [
          "The carrier information table on a standard BOL has two quantity pairs. **Handling units** are what the carrier physically moves: pallets, skids, crates. **Packages** are the cartons or pieces on them. Keying one into the other's column is the commonest mistake when BOLs are typed up by hand, and it changes piece counts, freight audits and claims.",
          "The converter keeps the two apart with their type codes (PLT, SKID, CTN, DRUM and so on), and puts weight, the hazmat mark, commodity description, NMFC item and class each in their own column.",
        ],
      },
      {
        kind: "list",
        heading: "Checks that run on every BOL",
        intro: "These run in ordinary code after the document is read:",
        items: [
          { text: "Package quantities on the lines are added up and compared with the grand total." },
          { text: "Handling units on the lines are added up and compared with the total handling units." },
          { text: "Line weights are added up and compared with the total weight." },
          { text: "A mismatch is shown as a warning above the table. On BOLs it often means a weight was corrected by hand at the dock, which is worth knowing either way." },
        ],
      },
      {
        kind: "list",
        heading: "It expects BOLs to look like BOLs",
        items: [
          { title: "Faxes and dock photos", text: "Skew, fax noise, a clipboard in the frame and a stamp across the corner are normal input." },
          { title: "Checkboxes", text: "Freight terms (Prepaid, Collect, 3rd Party) and the HM column are read from which box is marked." },
          { title: "Handwritten corrections", text: "When a printed weight or count has been struck and rewritten, the correction is used and the cell is highlighted so you can confirm it." },
          { title: "The customer order section", text: "If the BOL lists several customer orders with their own package counts and weights, that section is exported as a second sheet." },
        ],
      },
      {
        kind: "steps",
        heading: "How to convert a bill of lading to Excel",
        steps: [
          { title: "Upload the BOL", text: "A PDF from your TMS or email, a scan, or a phone photo. Get the whole page in frame and avoid flash glare." },
          { title: "Check the highlights", text: "Uncertain readings and totals that don't reconcile are tinted. Fix them against the document shown beside the table." },
          { title: "Download", text: "Excel with Freight lines, Details and an Import-ready sheet (one row per freight line with BOL number, shipper, consignee, carrier and PRO on each), or CSV." },
        ],
      },
      {
        kind: "list",
        heading: "Where it struggles",
        items: [
          { text: "**Ocean bills of lading and carrier-specific short forms.** Labelled header values are still read, and the table follows whatever columns are printed, but you will get container numbers, marks and vessel details as extra fields rather than NMFC and class. Treat these as best effort." },
          { text: "**Stamps and signatures over numbers.** If ink covers a figure, the cell is flagged or left empty rather than guessed." },
          { text: "**Master BOLs with long supplements.** One upload covers {pages} pages. Upload each BOL as its own file for clean results." },
          { text: "**Hazmat detail.** The HM column records only whether the box is marked. UN numbers, packing groups and emergency contacts are carried in the description text as printed. Do not rely on this tool for hazmat compliance." },
          { text: "**Validation.** It transcribes NMFC items and classes; it does not check that they are right for the commodity." },
        ],
      },
      PRIVACY_BLOCK,
    ],
    faq: [
      FREE_FAQ,
      {
        q: "Does it work on a photo taken at the dock?",
        a: "Yes, that is an expected input. Lay the page flat, get all four corners in the frame and avoid a shadow across the freight table.",
      },
      {
        q: "What is the difference between the BOL number and the PRO number?",
        a: "The BOL number is assigned by the shipper (on the standard form it is often a 17-digit number). The PRO number is the carrier's own tracking number for the shipment, usually on a sticker or in the carrier section. The converter returns them as separate fields.",
      },
      BULK_FAQ("bills of lading"),
      {
        q: "Can it send the data straight into my TMS?",
        a: "Not from the free tool: you download Excel or CSV and import it. If you want BOLs read and delivered into your system every day, that is the service we offer; use the button on this page.",
      },
      {
        q: "Does it handle ocean bills of lading?",
        a: "Partly. See the limits above: the standard domestic straight BOL is what it is tuned for.",
      },
    ],
    related: ["packing-slip-to-excel", "purchase-order-to-excel", "invoice-to-excel"],
    published: "2026-11-17",
    updated: "2026-11-17",
  },

  // --------------------------------------------------------------------------
  {
    slug: "packing-slip-to-excel",
    nav: "Packing slip",
    docType: "packing_slip",
    keyword: "packing slip to excel",
    demand:
      "Low-medium for 'packing slip to excel', medium (mixed with template searches) for 'packing list to excel' (imagetotable, Parabola, DigiParser). 'packing slip to csv' alone showed no demand, so CSV is covered here instead of on its own page. Named in program.md. Research 2026-11-17.",
    title: "Packing Slip to Excel or CSV: Convert Packing Lists, Free",
    description:
      "Upload a packing slip or packing list (PDF, scan or photo) and get SKUs, descriptions and ordered, shipped and backordered quantities as Excel or CSV. First {free} free.",
    h1: "Packing slip to Excel",
    blurb: "SKUs with ordered, shipped and backordered quantities from packing slips and packing lists.",
    intro:
      "Upload a packing slip or packing list as a PDF, scan or photo. Get each item with its SKU, description and ordered, shipped and backordered quantities as rows in Excel or CSV.",
    sample: { id: "packing-slip", label: "packing slip" },
    blocks: [
      {
        kind: "example",
        heading: "A real example",
        intro: "A sample packing slip and what the converter returned for it.",
      },
      { kind: "catalog", heading: "What gets pulled from a packing slip", intro: "Only what is printed appears. Packing slips rarely show prices, so there are usually none." },
      {
        kind: "prose",
        heading: "Ordered, shipped and backordered stay in separate columns",
        paragraphs: [
          "The whole point of a packing slip is the difference between what was ordered and what is in the box. So the converter never merges those numbers: ordered, shipped and backordered each get a column. When a slip has only one quantity column, it is treated as the shipped quantity.",
          "A blank backorder cell stays blank instead of becoming a zero, so filtering the sheet for backorders shows only real ones.",
        ],
      },
      {
        kind: "prose",
        heading: "Packing slip or packing list?",
        paragraphs: [
          "A **packing slip** travels inside a domestic parcel or on a pallet: order number, ship-to, and a list of SKUs with quantities. A **packing list** for an export shipment adds what customs and the forwarder need: carton or pallet numbers, marks, net and gross weights, sometimes dimensions.",
          "Both work here. Carton numbers, weights and lot or serial numbers go into their own columns when they are printed, and anything else on the document (dimensions, country of origin, HS codes) is kept under its printed column header.",
        ],
      },
      {
        kind: "list",
        heading: "What people do with the spreadsheet",
        items: [
          { title: "Receive against the PO", text: "Match SKU and shipped quantity to the order lines. Converting the [purchase order](/purchase-order-to-excel) the same way gives you two sheets with the same column names to compare." },
          { title: "Update inventory", text: "Paste or import the item and quantity columns into your inventory sheet or WMS." },
          { title: "Short-ship claims", text: "Filter on rows where shipped is less than ordered." },
          { title: "CSV for another system", text: "The CSV menu gives the table as it is, or an import-ready version with the packing slip number, order number and ship date on every row." },
        ],
      },
      {
        kind: "steps",
        heading: "How to convert a packing slip to Excel",
        steps: [
          { title: "Upload it", text: "PDF, scan, or a photo of the slip from the box." },
          { title: "Check the highlights", text: "Cells the converter wasn't sure of are tinted. Compare them with the document beside the table and correct if needed." },
          { title: "Download Excel or CSV", text: "Or copy the table and paste it straight into Google Sheets." },
        ],
      },
      {
        kind: "list",
        heading: "Where it struggles",
        items: [
          { text: "**No arithmetic to check.** Invoices can be verified by multiplying and adding. Packing slips usually cannot, so a misread quantity will not raise a warning. Review the highlighted cells and spot-check the rest." },
          { text: "**Barcodes.** The bars are not decoded. The printed digits under a barcode are read like any other text if they are legible." },
          { text: "**Receiving marks.** Ticks, circles and initials added by hand are ignored. A quantity written in by hand is read as a number and highlighted." },
          { text: "**Faded thermal labels.** Slips printed on label stock fade; faint characters come back flagged or empty." },
          { text: "**Kits and bundles.** Component lines printed under a kit come through as rows exactly as printed. The converter does not know which rows belong to which parent." },
        ],
      },
      PRIVACY_BLOCK,
    ],
    faq: [
      FREE_FAQ,
      { q: "Can I get CSV instead of Excel?", a: "Yes. The CSV menu offers the item table as shown, an import-ready version with the slip and order numbers on every row, and the header details." },
      BULK_FAQ("packing slips"),
      {
        q: "Does it read handwritten quantities, like a count written in at receiving?",
        a: "Yes, numbers written by hand are read, and they are highlighted so you can confirm them. Ticks and circles are not turned into quantities.",
      },
      {
        q: "Does it work for export packing lists?",
        a: "Yes. Carton numbers, weights and any extra printed columns are kept. See the section on packing slips versus packing lists above.",
      },
    ],
    related: ["purchase-order-to-excel", "bill-of-lading-to-excel", "invoice-to-excel"],
    published: "2026-11-17",
    updated: "2026-11-17",
  },

  // --------------------------------------------------------------------------
  {
    slug: "purchase-order-to-excel",
    nav: "Purchase order",
    docType: "purchase_order",
    keyword: "purchase order to excel",
    demand:
      "Medium-high. Parseur runs to-excel, to-csv and to-google-sheets pages for purchase orders; Lido, DocuClipper, Parabola and imagetotable also target it. Research 2026-11-17.",
    title: "Purchase Order to Excel: Convert a PO PDF to a Spreadsheet",
    description:
      "Turn a customer's purchase order (PDF, scan or photo) into rows: line, SKU, description, quantity, price and required date, with the PO number alongside. First {free} free.",
    h1: "Purchase order to Excel",
    blurb: "PO lines with SKU, quantity, price and required date, for order entry.",
    intro:
      "Turn a purchase order that arrived as a PDF, scan or photo into rows: line number, SKU, description, quantity, unit, price and required date, with the PO number, buyer and ship-to alongside.",
    sample: { id: "purchase-order", label: "purchase order" },
    blocks: [
      {
        kind: "example",
        heading: "A real example",
        intro: "A sample purchase order and what the converter returned for it.",
      },
      { kind: "catalog", heading: "What gets pulled from a purchase order" },
      {
        kind: "prose",
        heading: "Built for order entry",
        paragraphs: [
          "When a customer's PO arrives as a PDF and someone re-keys it into the order system, three mistakes cause most of the trouble: a quantity lands on the wrong SKU, a price is mistyped, or a required date is missed. The converter keeps each line's SKU, quantity and price together even when the table breaks across a page, checks that quantity × price equals the extended amount on every row, and puts line-level delivery dates in their own column.",
          "A note on names: the **buyer** issues the purchase order and the **vendor** is the supplier who receives it. If you are the supplier doing order entry, your customer is in the Buyer field.",
        ],
      },
      {
        kind: "list",
        heading: "Checks that run on every PO",
        items: [
          { text: "Quantity × unit price against the extended amount, row by row." },
          { text: "The line amounts against the PO subtotal or total." },
          { text: "Subtotal, tax and shipping against the total, when the PO shows them." },
        ],
      },
      {
        kind: "steps",
        heading: "How to convert a purchase order to Excel",
        steps: [
          { title: "Upload the PO", text: "The PDF your customer emailed, a scan, or a photo." },
          { title: "Check the highlights", text: "Rows that don't multiply out and cells the converter was unsure of are tinted. The PO is shown beside the table." },
          { title: "Download", text: "Excel, CSV, or copy and paste. The Import-ready layout repeats PO number, date, buyer and vendor on every line for loading into an order or ERP import." },
        ],
      },
      {
        kind: "list",
        heading: "Where it struggles",
        items: [
          { text: "**Blanket orders and release schedules.** A line with several delivery dates and quantities keeps them as printed, usually as text in one cell. You will need to split those by hand." },
          { text: "**Terms and conditions pages.** They are ignored, but they still count toward the {pages}-page limit per upload." },
          { text: "**Change orders.** When a revised PO shows struck-through and replaced values, the current value is used and the cell is highlighted." },
          { text: "**Units of measure.** CS, EA and BX are copied as printed. Nothing is converted between units, and nothing is checked against your price list or item master." },
        ],
      },
      PRIVACY_BLOCK,
    ],
    faq: [
      FREE_FAQ,
      BULK_FAQ("purchase orders"),
      {
        q: "Can I compare a PO with the invoice or packing slip for it?",
        a: "Convert each one and you get sheets with matching column names (SKU, Description, Quantity and so on), which makes a lookup or a side-by-side comparison straightforward. The matching itself is up to you. See [invoice to Excel](/invoice-to-excel) and [packing slip to Excel](/packing-slip-to-excel).",
      },
      {
        q: "Does it read POs that were faxed or printed and scanned?",
        a: "Yes. It reads the page image, so selectable text is not required.",
      },
      {
        q: "Is this EDI?",
        a: "No. It turns a document meant for people into rows. If your customer can send EDI, use that; this is for the ones who send PDFs.",
      },
    ],
    related: ["invoice-to-excel", "packing-slip-to-excel", "handwritten-to-excel"],
    published: "2026-11-17",
    updated: "2026-11-17",
  },

  // --------------------------------------------------------------------------
  {
    slug: "receipt-to-excel",
    nav: "Receipt",
    docType: "receipt",
    keyword: "receipt to excel",
    demand:
      "High. Klippa, SparkReceipt, SaasAnt, DocuClipper, Lido, CleanTably and others target 'receipt to excel' and 'receipt scanner to spreadsheet'. Research 2026-11-17.",
    title: "Receipt to Excel: Turn a Photo of a Receipt into a Spreadsheet",
    description:
      "Photograph a receipt and get the merchant, date, items, tax and total in Excel or CSV. Handles long, crumpled and faded receipts and checks that the items add up. First {free} free.",
    h1: "Receipt to Excel",
    blurb: "Merchant, date, items, tax and total from a photo, with the total checked.",
    intro:
      "Photograph a receipt and get the merchant, date, every item, tax and total in a spreadsheet. It checks that the items add up to the total, which is how misread digits on thermal paper get caught.",
    sample: { id: "receipt", label: "receipt" },
    blocks: [
      {
        kind: "example",
        heading: "A real example",
        intro: "A sample receipt and what the converter returned for it.",
      },
      { kind: "catalog", heading: "What gets pulled from a receipt" },
      {
        kind: "prose",
        heading: "For expense reports and bookkeeping",
        paragraphs: [
          "One receipt gives you an Items sheet and a Details sheet with merchant, date, payment method, subtotal, tax, tip and total.",
          "For a month of receipts, upload them together. The workbook's Summary sheet has one row per receipt (merchant, date, tax, total), which is the shape an expense log needs, and a second sheet lists every item from every receipt with its merchant and date.",
        ],
      },
      {
        kind: "list",
        heading: "The total is checked, not trusted",
        intro: "Thermal print fades and creases, and a 3 becomes an 8. After the receipt is read, ordinary code checks it:",
        items: [
          { text: "Item amounts are added up and compared with the subtotal (or with the total, on receipts that include tax in the prices)." },
          { text: "Subtotal, tax and tip are compared with the total." },
          { text: "If it doesn't reconcile you see a warning, and you can fix the digit against the photo shown beside the table." },
        ],
      },
      {
        kind: "list",
        heading: "Getting a readable photo",
        items: [
          { text: "Flatten the receipt and fill the frame with it." },
          { text: "Use daylight or a bright room. Flash on thermal paper creates glare that wipes out digits." },
          { text: "For a very long receipt, take two overlapping photos, select both, and choose \"pages of one document\"." },
          { text: "One receipt per photo. Several receipts in one image are read as a single document." },
        ],
      },
      {
        kind: "list",
        heading: "Where it struggles",
        items: [
          { text: "**Faded thermal paper.** If the print is nearly gone, cells come back flagged or empty. It will not invent a number." },
          { text: "**Weighed items.** A line such as 0.82 lb at 3.99/lb becomes quantity 0.82 and unit price 3.99. Odd layouts can put those in the wrong columns." },
          { text: "**Discounts and coupons.** They become their own rows with negative amounts, which is right for adding up but may not be how you want to log them." },
          { text: "**Card slips.** A slip showing only the total has no items to extract; you get the details only." },
          { text: "**Categories.** It does not assign expense categories or tax codes." },
        ],
      },
      PRIVACY_BLOCK,
    ],
    faq: [
      FREE_FAQ,
      BULK_FAQ("receipts"),
      {
        q: "Does it work with a photo from my phone?",
        a: "Yes. On a phone the upload button offers the camera directly. The photo is shrunk in your browser before upload, so it is quick even on mobile data.",
      },
      {
        q: "Can it read handwritten receipts?",
        a: "Often, yes. Handwritten amounts are read and highlighted for you to confirm. See [handwriting to Excel](/handwritten-to-excel) for what to expect.",
      },
      { q: "Does it work for receipts in other currencies?", a: "Amounts are read as numbers whatever the currency, and the currency is recorded when the receipt makes it clear. Nothing is converted." },
      { q: "Can I get CSV or paste into Google Sheets?", a: "Yes. Use the CSV menu, or Copy and then paste into a sheet." },
    ],
    related: ["invoice-to-excel", "handwritten-to-excel", "invoice-to-csv"],
    published: "2026-11-17",
    updated: "2026-11-17",
  },

  // --------------------------------------------------------------------------
  {
    slug: "handwritten-to-excel",
    nav: "Handwriting",
    docType: "auto",
    keyword: "handwritten to excel",
    demand:
      "High. Lido runs four or more pages on handwriting/handwritten forms to Excel; Pen to Print, Algodocs and Transkribus target it; an exact-match domain exists. 'Handwritten order' is named in program.md. Research 2026-11-17.",
    title: "Handwriting to Excel: Convert Handwritten Forms and Tables",
    description:
      "Photograph a handwritten order form, tally sheet, log or table and get typed rows in Excel or CSV. Readings it isn't sure of are highlighted, not silently guessed. First {free} free.",
    h1: "Handwriting to Excel",
    blurb: "Handwritten order forms, tally sheets and logs as typed rows, with doubtful readings highlighted.",
    intro:
      "Photograph a handwritten order form, tally sheet, log or table and get typed rows in Excel. Readings the converter isn't sure of are highlighted instead of silently guessed.",
    sample: { id: "handwritten-order", label: "handwritten order" },
    blocks: [
      {
        kind: "example",
        heading: "A real example",
        intro: "A sample order form filled in by hand and what the converter returned for it.",
      },
      {
        kind: "list",
        heading: "What it reads",
        items: [
          { title: "Order forms", text: "A printed grid filled in by hand by a rep, driver or customer: quantities, items, prices." },
          { title: "Tally and count sheets", text: "Stock counts, production tallies, delivery and route sheets." },
          { title: "Logs", text: "Sign-in sheets, temperature and maintenance logs, mileage logs: anything in ruled rows and columns." },
          { title: "Handwritten invoices and receipts", text: "Carbon-copy invoice books and hand-written receipts, with their totals." },
          { title: "Tables in notebooks", text: "A hand-drawn table works if the rows and columns are reasonably straight." },
        ],
      },
      {
        kind: "prose",
        heading: "Unsure is better than wrong",
        paragraphs: [
          "Handwriting has well-known traps: 1 and 7, 0 and 6, 4 and 9, 5 and S. Software that always returns a confident answer hides those mistakes in a spreadsheet that looks clean.",
          "This converter gives its best reading and marks the cell when it had to guess, with the reason, for example \"7 or 1\". You see the original beside the table, click the cell, and settle it. When the form has prices and totals, the arithmetic is checked as well, so a misread quantity that breaks a line total is highlighted even if the model felt sure.",
        ],
      },
      {
        kind: "list",
        heading: "How it treats handwriting conventions",
        items: [
          { title: "Ditto marks and arrows", text: "A ditto mark or a line drawn down a column repeats the value above." },
          { title: "Crossings-out", text: "A struck-out entry is skipped. If a value was corrected, the correction is used and the cell is highlighted." },
          { title: "Blank rows", text: "Printed rows nobody filled in are left out." },
          { title: "Quantities with units", text: "\"2 cs\" becomes quantity 2 and unit cs, so the quantity column stays numeric." },
          { title: "Fractions", text: "Kept as written, for example 1/2." },
          { title: "Ticks and circles", text: "Not interpreted. If a tick means \"yes\" on your form, that column will come back empty." },
        ],
      },
      {
        kind: "catalog",
        docType: "order_form",
        heading: "For order forms, these are the columns",
        intro: "Other handwritten tables keep whatever column headers are on the page.",
      },
      {
        kind: "list",
        heading: "Getting a good photo of handwriting",
        items: [
          { text: "Pen reads better than pencil; dark ink better than light." },
          { text: "Lay the page flat and photograph it straight on, with all four corners in the frame." },
          { text: "Use even light and keep your phone's shadow off the page." },
          { text: "One page per photo. For a multi-page form, select the photos together and choose \"pages of one document\"." },
        ],
      },
      {
        kind: "list",
        heading: "Where it struggles",
        items: [
          { text: "**It depends on the handwriting.** Clear block print is usually read correctly. Rushed cursive is not. We do not publish an accuracy figure because it would not describe your handwriting." },
          { text: "**Paragraphs of notes.** It is built for rows and columns. Free-text notes are transcribed as best it can, and are the weakest part." },
          { text: "**Tiny or crowded writing.** Entries squeezed between lines or written over each other are flagged or missed." },
          { text: "**Your shorthand.** Abbreviations are copied, not expanded. \"cs wh mlk\" stays \"cs wh mlk\"." },
          { text: "**Other languages and scripts.** We have only tested handwriting in English. Other languages may work, but we cannot vouch for them." },
          { text: "**Always review.** Check every highlighted cell and skim the rest before you rely on the sheet." },
        ],
      },
      PRIVACY_BLOCK,
    ],
    faq: [
      FREE_FAQ,
      {
        q: "Can it read my handwriting?",
        a: "The honest answer is: try it. The first {free} documents are free without sign-up, and you will see within seconds how it copes, with every doubtful cell highlighted.",
      },
      {
        q: "Does it work on printed forms that were filled in by hand?",
        a: "Yes, that is the main case it is built for. It reads the handwriting in each box and uses the printed headings as column names.",
      },
      BULK_FAQ("handwritten forms"),
      {
        q: "We get a stack of handwritten order forms every day. Can this be automated?",
        a: "The free tool handles them one batch at a time. If it is a daily pile, we can take it over: forms read, checked and delivered as rows in your order system's import format. Use the button on this page to tell us about it.",
      },
      { q: "Does it read signatures?", a: "No. Signatures and initials are ignored." },
    ],
    related: ["receipt-to-excel", "purchase-order-to-excel", "invoice-to-excel"],
    published: "2026-11-17",
    updated: "2026-11-17",
  },
];

export function pageBySlug(slug: string): ToolPage | undefined {
  return PAGES.find((page) => page.slug === slug);
}

/** Pages for the header (short list) or footer (all). */
export function navPages(all = false): ToolPage[] {
  return all ? PAGES : PAGES.filter((page) => page.slug !== "invoice-to-csv");
}
