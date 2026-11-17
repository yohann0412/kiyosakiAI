import type { DocTypeHint, DocTypeId, DocTypeSpec, ValueType } from "./types";

/**
 * Canonical fields and columns per document type.
 *
 * Keys are stable identifiers: exports, bulk merges, the eval set and the
 * search pages all rely on them. Add keys freely; rename them only together
 * with every consumer.
 */

const f = (key: string, label: string, type: ValueType = "text", hint?: string) => ({
  key,
  label,
  type,
  hint,
});

export const DOC_TYPES: Record<DocTypeId, DocTypeSpec> = {
  invoice: {
    id: "invoice",
    label: "Invoice",
    plural: "invoices",
    tableName: "Line items",
    fields: [
      f("invoice_number", "Invoice number"),
      f("invoice_date", "Invoice date", "date"),
      f("due_date", "Due date", "date"),
      f("po_number", "PO number", "text", "customer purchase order reference"),
      f("vendor_name", "Vendor", "text", "the business that issued the invoice"),
      f("vendor_address", "Vendor address"),
      f("vendor_tax_id", "Vendor tax ID", "text", "VAT, GST, EIN or ABN number"),
      f("customer_name", "Customer", "text", "the business being billed"),
      f("bill_to_address", "Bill-to address"),
      f("ship_to_address", "Ship-to address"),
      f("payment_terms", "Payment terms", "text", "e.g. Net 30"),
      f("currency", "Currency", "text", "ISO code such as USD when it can be told"),
      f("subtotal", "Subtotal", "money"),
      f("discount_total", "Discount", "money"),
      f("tax_total", "Tax", "money"),
      f("shipping_total", "Shipping", "money", "freight, delivery or handling charge"),
      f("total", "Total", "money"),
      f("amount_due", "Amount due", "money", "only when it differs from the total or is printed separately"),
    ],
    columns: [
      f("sku", "SKU", "text", "item, part or product code"),
      f("description", "Description"),
      f("quantity", "Quantity", "number"),
      f("unit", "Unit", "text", "unit of measure such as EA, CS, KG, HR"),
      f("unit_price", "Unit price", "money"),
      f("discount", "Discount", "money"),
      f("tax_rate", "Tax rate", "text", "per-line tax or VAT rate, as printed"),
      f("amount", "Amount", "money", "line total"),
    ],
    guidance:
      "Line items are the billable rows only. Subtotal, tax, shipping and total rows belong in fields, not in the table. " +
      "A description that wraps over several printed lines is one row. The vendor is the issuer (usually the logo or letterhead); the customer is the Bill To party.",
  },

  packing_slip: {
    id: "packing_slip",
    label: "Packing slip",
    plural: "packing slips",
    tableName: "Items",
    fields: [
      f("packing_slip_number", "Packing slip number"),
      f("order_number", "Order number", "text", "sales order number"),
      f("po_number", "PO number", "text", "customer purchase order reference"),
      f("ship_date", "Ship date", "date"),
      f("shipper_name", "Shipper", "text", "the seller or warehouse sending the goods"),
      f("ship_from_address", "Ship-from address"),
      f("ship_to_name", "Ship to"),
      f("ship_to_address", "Ship-to address"),
      f("carrier", "Carrier"),
      f("tracking_number", "Tracking number"),
      f("ship_method", "Ship method", "text", "service level such as Ground or LTL"),
      f("total_packages", "Total packages", "number", "cartons, boxes or pallets in the shipment"),
      f("total_weight", "Total weight", "text", "with its unit, e.g. 412 lb"),
    ],
    columns: [
      f("sku", "SKU", "text", "item, part or product code"),
      f("description", "Description"),
      f("quantity_ordered", "Qty ordered", "number"),
      f("quantity_shipped", "Qty shipped", "number"),
      f("quantity_backordered", "Qty backordered", "number"),
      f("unit", "Unit", "text", "unit of measure"),
      f("carton", "Carton", "text", "box, carton or pallet number the line is packed in"),
      f("weight", "Weight", "text", "line weight with unit if printed"),
      f("lot_number", "Lot / serial", "text"),
    ],
    guidance:
      "Packing slips and packing lists show what was shipped, usually without prices. Keep ordered, shipped and backordered quantities in their own columns; " +
      "if the document has a single quantity column, use quantity_shipped. A blank backorder cell stays empty rather than 0.",
  },

  bill_of_lading: {
    id: "bill_of_lading",
    label: "Bill of lading",
    plural: "bills of lading",
    tableName: "Freight lines",
    fields: [
      f("bol_number", "BOL number"),
      f("ship_date", "Ship date", "date"),
      f("shipper_name", "Shipper", "text", "Ship From party"),
      f("shipper_address", "Shipper address"),
      f("consignee_name", "Consignee", "text", "Ship To party"),
      f("consignee_address", "Consignee address"),
      f("bill_to_name", "Freight bill to", "text", "third party paying freight charges, if any"),
      f("carrier_name", "Carrier"),
      f("scac", "SCAC", "text", "2 to 4 letter carrier code"),
      f("pro_number", "PRO number"),
      f("trailer_number", "Trailer number"),
      f("seal_number", "Seal number"),
      f("po_number", "PO number", "text", "customer order or PO numbers; join several with ', '"),
      f("freight_terms", "Freight terms", "text", "Prepaid, Collect or 3rd Party - whichever box is marked"),
      f("special_instructions", "Special instructions"),
      f("total_handling_units", "Total handling units", "number", "pallets or skids"),
      f("total_packages", "Total packages", "number", "cartons or pieces"),
      f("total_weight", "Total weight", "text", "with its unit, e.g. 4,812 lb"),
      f("cod_amount", "COD amount", "money"),
    ],
    columns: [
      f("handling_unit_qty", "Handling unit qty", "number", "number of pallets or skids on the line"),
      f("handling_unit_type", "Handling unit type", "text", "e.g. PLT, SKID"),
      f("package_qty", "Package qty", "number", "number of cartons or pieces on the line"),
      f("package_type", "Package type", "text", "e.g. CTN, BOX, DRUM"),
      f("weight", "Weight", "number", "line weight as a plain number; the unit goes in total_weight"),
      f("hazmat", "HM", "text", "X when the hazardous-material box is marked, else empty"),
      f("description", "Commodity description"),
      f("nmfc", "NMFC", "text", "NMFC item number, e.g. 156600-3"),
      f("class", "Class", "text", "freight class, e.g. 70 or 92.5"),
    ],
    guidance:
      "On a standard (VICS) bill of lading the main table is the CARRIER INFORMATION section: one row per commodity line. " +
      "If the document also has a CUSTOMER ORDER INFORMATION section with several orders, return it as a second table named 'Customer orders' " +
      "with columns order_number, package_qty, weight, pallet_slip (Y or N) and additional_info. " +
      "Grand-total rows go in fields, not in tables. Checkbox answers (freight terms, hazmat) are read from which box is marked.",
  },

  purchase_order: {
    id: "purchase_order",
    label: "Purchase order",
    plural: "purchase orders",
    tableName: "Line items",
    fields: [
      f("po_number", "PO number"),
      f("po_date", "PO date", "date"),
      f("buyer_name", "Buyer", "text", "the business issuing the purchase order"),
      f("buyer_address", "Buyer address"),
      f("vendor_name", "Vendor", "text", "the supplier the order is placed with"),
      f("vendor_address", "Vendor address"),
      f("ship_to_name", "Ship to"),
      f("ship_to_address", "Ship-to address"),
      f("delivery_date", "Delivery date", "date", "requested or required-by date"),
      f("payment_terms", "Payment terms"),
      f("ship_method", "Ship via"),
      f("freight_terms", "FOB / Incoterms"),
      f("requested_by", "Requested by", "text", "buyer contact or requisitioner"),
      f("currency", "Currency", "text", "ISO code such as USD when it can be told"),
      f("subtotal", "Subtotal", "money"),
      f("tax_total", "Tax", "money"),
      f("shipping_total", "Shipping", "money"),
      f("total", "Total", "money"),
    ],
    columns: [
      f("line_number", "Line", "text"),
      f("sku", "SKU", "text", "item, part or product code"),
      f("description", "Description"),
      f("quantity", "Quantity", "number"),
      f("unit", "Unit", "text", "unit of measure"),
      f("unit_price", "Unit price", "money"),
      f("delivery_date", "Delivery date", "date", "per-line required date, if printed"),
      f("amount", "Amount", "money", "line total"),
    ],
    guidance:
      "The buyer issues the purchase order; the vendor (supplier) receives it. Totals belong in fields, not in the table.",
  },

  receipt: {
    id: "receipt",
    label: "Receipt",
    plural: "receipts",
    tableName: "Items",
    fields: [
      f("merchant_name", "Merchant"),
      f("merchant_address", "Merchant address"),
      f("merchant_phone", "Merchant phone"),
      f("receipt_number", "Receipt number", "text", "transaction, ticket or check number"),
      f("date", "Date", "date"),
      f("time", "Time", "text", "24-hour HH:MM"),
      f("payment_method", "Payment method", "text", "e.g. Visa, Cash, Debit"),
      f("card_last4", "Card last 4"),
      f("currency", "Currency", "text", "ISO code such as USD when it can be told"),
      f("subtotal", "Subtotal", "money"),
      f("tax_total", "Tax", "money"),
      f("tip", "Tip", "money"),
      f("total", "Total", "money"),
    ],
    columns: [
      f("sku", "Item code", "text"),
      f("description", "Description"),
      f("quantity", "Quantity", "number"),
      f("unit_price", "Unit price", "money"),
      f("amount", "Amount", "money", "line total"),
    ],
    guidance:
      "One row per purchased item. A discount or coupon printed under an item is its own row with a negative amount. " +
      "Subtotal, tax, tip, total, tendered and change lines are fields, not rows. When no quantity is printed, leave quantity empty.",
  },

  order_form: {
    id: "order_form",
    label: "Order form",
    plural: "order forms",
    tableName: "Order lines",
    fields: [
      f("order_number", "Order number"),
      f("order_date", "Order date", "date"),
      f("customer_name", "Customer"),
      f("customer_phone", "Customer phone"),
      f("customer_address", "Customer address"),
      f("delivery_date", "Delivery date", "date"),
      f("taken_by", "Taken by", "text", "salesperson, driver or rep who wrote the order"),
      f("notes", "Notes", "text", "free-text instructions written on the form"),
      f("subtotal", "Subtotal", "money"),
      f("tax_total", "Tax", "money"),
      f("total", "Total", "money"),
    ],
    columns: [
      f("quantity", "Quantity", "number"),
      f("unit", "Unit", "text", "unit of measure such as cs, ea, lb, doz"),
      f("sku", "SKU", "text", "item or product code"),
      f("description", "Description"),
      f("unit_price", "Unit price", "money"),
      f("amount", "Amount", "money", "line total"),
    ],
    guidance:
      "Order forms are often handwritten onto a printed grid. Read the handwriting, not just the printed labels. " +
      "Skip printed rows the writer left blank. Crossed-out entries are skipped; if a value was corrected, use the correction. " +
      "Ditto marks or a vertical line under a value repeat the value above.",
  },

  other: {
    id: "other",
    label: "Document",
    plural: "documents",
    tableName: "Table",
    fields: [],
    columns: [],
    guidance:
      "This is not one of the known document types. Return the labelled header values as fields and the main table as it is laid out, " +
      "using the printed column headers.",
  },
};

export const DOC_TYPE_IDS = Object.keys(DOC_TYPES) as DocTypeId[];

/** Types offered in the tool's picker, in display order. */
export const PICKER_TYPES: DocTypeId[] = [
  "invoice",
  "packing_slip",
  "bill_of_lading",
  "purchase_order",
  "receipt",
  "order_form",
];

export function isDocTypeId(value: unknown): value is DocTypeId {
  return typeof value === "string" && value in DOC_TYPES;
}

export function toHint(value: unknown): DocTypeHint {
  return isDocTypeId(value) ? value : "auto";
}

export function fieldSpec(docType: DocTypeId, key: string) {
  return DOC_TYPES[docType].fields.find((x) => x.key === key);
}

export function columnSpec(docType: DocTypeId, key: string) {
  return DOC_TYPES[docType].columns.find((x) => x.key === key);
}

/** "customer_po_ref" -> "Customer po ref" */
export function labelFromKey(key: string): string {
  const words = key.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : key;
}

/** Any text -> safe snake_case key. */
export function toKey(text: string): string {
  const key = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/#/g, " number ")
    .replace(/%/g, " pct ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return key || "column";
}
