import type { RawExtraction } from "../prompt";
import type { DocTypeHint, DocTypeId } from "../types";
import type { ProviderRequest, ProviderResponse } from "./anthropic";

/**
 * Canned results for local development and automated UI tests, so the whole
 * product can be exercised without a model key.
 *
 * Only ever used when EXTRACTOR_PROVIDER=mock is set explicitly. It does not
 * read the uploaded file, so it must never run in production.
 */

const SAMPLES: Record<DocTypeId, RawExtraction> = {
  invoice: {
    document_type: "invoice",
    fields: [
      { key: "invoice_number", label: "Invoice #", value: "INV-20418" },
      { key: "invoice_date", label: "Date", value: "2026-11-03" },
      { key: "due_date", label: "Due", value: "2026-12-03" },
      { key: "po_number", label: "PO #", value: "PO-7731" },
      { key: "vendor_name", label: "From", value: "Northgate Packaging Supply" },
      { key: "customer_name", label: "Bill To", value: "Harbor Street Foods" },
      { key: "payment_terms", label: "Terms", value: "Net 30" },
      { key: "subtotal", label: "Subtotal", value: "1,522.50" },
      { key: "tax_total", label: "Sales tax", value: "121.80" },
      { key: "shipping_total", label: "Freight", value: "85.00" },
      { key: "total", label: "Total", value: "1,729.30" },
    ],
    tables: [
      {
        name: "Line items",
        columns: [
          { key: "sku", label: "Item #", type: "text" },
          { key: "description", label: "Description", type: "text" },
          { key: "quantity", label: "Qty", type: "number" },
          { key: "unit", label: "UOM", type: "text" },
          { key: "unit_price", label: "Price", type: "money" },
          { key: "amount", label: "Amount", type: "money" },
        ],
        rows: [
          ["BX-1208", "Corrugated box 12x8x6, 32 ECT", "500", "EA", "0.84", "420.00"],
          ["TP-220", "Packing tape 2in x 110yd, clear", "36", "RL", "3.25", "117.00"],
          ["SW-18", "Stretch wrap 18in x 1500ft, 80 ga", "24", "RL", "21.50", "516.00"],
          ["LB-46", "Thermal labels 4x6, fanfold", "12", "CS", "38.00", "456.00"],
          ["ED-01", "Edge protectors 2x2x36", "50", "EA", "0.27", "13.50"],
        ],
      },
    ],
    uncertain: [{ table: 0, row: 3, column: "unit_price", reason: "faint print: 21.50 or 21.80" }],
    uncertain_fields: [],
    notes: [],
  },
  packing_slip: {
    document_type: "packing_slip",
    fields: [
      { key: "packing_slip_number", label: "Packing Slip #", value: "PS-88213" },
      { key: "order_number", label: "Order #", value: "SO-45102" },
      { key: "po_number", label: "Customer PO", value: "4500019872" },
      { key: "ship_date", label: "Ship Date", value: "2026-11-05" },
      { key: "shipper_name", label: "From", value: "Calder Industrial Supply" },
      { key: "ship_to_name", label: "Ship To", value: "Brightwater Marine Services" },
      { key: "carrier", label: "Carrier", value: "UPS Freight" },
      { key: "total_packages", label: "Cartons", value: "7" },
      { key: "total_weight", label: "Weight", value: "214 lb" },
    ],
    tables: [
      {
        name: "Items",
        columns: [
          { key: "sku", label: "Item", type: "text" },
          { key: "description", label: "Description", type: "text" },
          { key: "quantity_ordered", label: "Ordered", type: "number" },
          { key: "quantity_shipped", label: "Shipped", type: "number" },
          { key: "quantity_backordered", label: "B/O", type: "number" },
          { key: "unit", label: "UM", type: "text" },
        ],
        rows: [
          ["HV-3410", "Ball valve 3/4in brass, full port", "40", "40", "", "EA"],
          ["GS-1150", "Gasket kit, 1-1/2in flange", "25", "20", "5", "KT"],
          ["HS-0600", "Hose clamp 6in stainless", "200", "200", "", "EA"],
          ["PT-2210", "PTFE thread seal tape 1/2in", "60", "48", "12", "RL"],
        ],
      },
    ],
    uncertain: [],
    uncertain_fields: [],
    notes: [],
  },
  bill_of_lading: {
    document_type: "bill_of_lading",
    fields: [
      { key: "bol_number", label: "Bill of Lading Number", value: "08471200003915527" },
      { key: "ship_date", label: "Date", value: "2026-11-06" },
      { key: "shipper_name", label: "Ship From", value: "Redfield Tile & Stone" },
      { key: "consignee_name", label: "Ship To", value: "Osprey Building Supply DC 4" },
      { key: "carrier_name", label: "Carrier Name", value: "Summit Ridge Freight" },
      { key: "scac", label: "SCAC", value: "SRFL" },
      { key: "pro_number", label: "Pro Number", value: "771-204418" },
      { key: "trailer_number", label: "Trailer Number", value: "53-1187" },
      { key: "seal_number", label: "Seal Number(s)", value: "0044821" },
      { key: "freight_terms", label: "Freight Charge Terms", value: "Prepaid" },
      { key: "total_handling_units", label: "Grand Total", value: "6" },
      { key: "total_packages", label: "Grand Total", value: "212" },
      { key: "total_weight", label: "Grand Total", value: "9,480 lb" },
    ],
    tables: [
      {
        name: "Carrier information",
        columns: [
          { key: "handling_unit_qty", label: "Qty", type: "number" },
          { key: "handling_unit_type", label: "Type", type: "text" },
          { key: "package_qty", label: "Qty", type: "number" },
          { key: "package_type", label: "Type", type: "text" },
          { key: "weight", label: "Weight", type: "number" },
          { key: "description", label: "Commodity Description", type: "text" },
          { key: "nmfc", label: "NMFC #", type: "text" },
          { key: "class", label: "Class", type: "text" },
        ],
        rows: [
          ["3", "PLT", "120", "CTN", "5,400", "Ceramic floor tile, boxed", "47500-2", "50"],
          ["2", "PLT", "80", "CTN", "3,600", "Porcelain wall tile, boxed", "47500-2", "50"],
          ["1", "PLT", "12", "PAIL", "480", "Tile adhesive, non-hazardous", "4620-1", "55"],
        ],
      },
    ],
    uncertain: [],
    uncertain_fields: [],
    notes: [],
  },
  purchase_order: {
    document_type: "purchase_order",
    fields: [
      { key: "po_number", label: "PO Number", value: "PO-2026-01184" },
      { key: "po_date", label: "Date", value: "2026-11-02" },
      { key: "buyer_name", label: "Buyer", value: "Tamarack Outfitters" },
      { key: "vendor_name", label: "Vendor", value: "Kestrel Textile Mills" },
      { key: "delivery_date", label: "Required By", value: "2026-11-24" },
      { key: "payment_terms", label: "Terms", value: "2% 10, Net 45" },
      { key: "subtotal", label: "Subtotal", value: "8,610.00" },
      { key: "total", label: "Total", value: "8,610.00" },
    ],
    tables: [
      {
        name: "Line items",
        columns: [
          { key: "line_number", label: "Line", type: "text" },
          { key: "sku", label: "Item No.", type: "text" },
          { key: "description", label: "Description", type: "text" },
          { key: "quantity", label: "Qty", type: "number" },
          { key: "unit", label: "UOM", type: "text" },
          { key: "unit_price", label: "Unit Cost", type: "money" },
          { key: "amount", label: "Ext. Cost", type: "money" },
        ],
        rows: [
          ["1", "FLC-200-NVY", "Fleece 200 wt, navy, 60in", "400", "YD", "6.40", "2,560.00"],
          ["2", "FLC-200-CHR", "Fleece 200 wt, charcoal, 60in", "400", "YD", "6.40", "2,560.00"],
          ["3", "RIP-70D-OLV", "Ripstop nylon 70D, olive", "600", "YD", "4.85", "2,910.00"],
          ["4", "ZIP-YKK5-BLK", "Coil zipper #5, black, 24in", "1000", "EA", "0.58", "580.00"],
        ],
      },
    ],
    uncertain: [],
    uncertain_fields: [],
    notes: [],
  },
  receipt: {
    document_type: "receipt",
    fields: [
      { key: "merchant_name", label: "", value: "Alder & Ash Hardware" },
      { key: "date", label: "Date", value: "2026-11-08" },
      { key: "time", label: "Time", value: "14:32" },
      { key: "payment_method", label: "Paid", value: "Visa" },
      { key: "card_last4", label: "Card", value: "4417" },
      { key: "subtotal", label: "Subtotal", value: "61.43" },
      { key: "tax_total", label: "Tax", value: "4.91" },
      { key: "total", label: "Total", value: "66.34" },
    ],
    tables: [
      {
        name: "Items",
        columns: [
          { key: "description", label: "", type: "text" },
          { key: "quantity", label: "", type: "number" },
          { key: "unit_price", label: "", type: "money" },
          { key: "amount", label: "", type: "money" },
        ],
        rows: [
          ["Deck screws #8 x 2-1/2in 1lb", "2", "9.49", "18.98"],
          ["Wood glue 16 oz", "1", "7.99", "7.99"],
          ["Sanding sponge med", "3", "3.49", "10.47"],
          ["Paint roller cover 9in 3pk", "1", "11.99", "11.99"],
          ["Drop cloth 9x12 canvas", "1", "12.00", "12.00"],
        ],
      },
    ],
    uncertain: [],
    uncertain_fields: [],
    notes: [],
  },
  order_form: {
    document_type: "order_form",
    fields: [
      { key: "order_date", label: "Date", value: "2026-11-09" },
      { key: "customer_name", label: "Customer", value: "Linden Cafe" },
      { key: "delivery_date", label: "Deliver", value: "2026-11-11" },
      { key: "taken_by", label: "Rep", value: "Marco" },
    ],
    tables: [
      {
        name: "Order lines",
        columns: [
          { key: "quantity", label: "Qty", type: "number" },
          { key: "unit", label: "Unit", type: "text" },
          { key: "description", label: "Item", type: "text" },
          { key: "unit_price", label: "Price", type: "money" },
          { key: "amount", label: "Total", type: "money" },
        ],
        rows: [
          ["4", "cs", "Whole milk, gallon", "18.50", "74.00"],
          ["2", "cs", "Oat milk barista", "31.00", "62.00"],
          ["6", "doz", "Eggs, large", "3.75", "22.50"],
          ["1", "cs", "Butter, unsalted 1 lb", "86.00", "86.00"],
          ["7", "lb", "Espresso beans", "11.20", "78.40"],
        ],
      },
    ],
    uncertain: [
      { table: 0, row: 5, column: "quantity", reason: "handwritten 7 could be a 1" },
      { table: 0, row: 3, column: "unit_price", reason: "3.75 or 3.15" },
    ],
    uncertain_fields: [],
    notes: [],
  },
  other: {
    document_type: "other",
    fields: [{ key: "title", label: "Title", value: "Sample table" }],
    tables: [
      {
        name: "Table",
        columns: [
          { key: "item", label: "Item", type: "text" },
          { key: "value", label: "Value", type: "text" },
        ],
        rows: [
          ["Alpha", "10"],
          ["Beta", "20"],
        ],
      },
    ],
    uncertain: [],
    uncertain_fields: [],
    notes: [],
  },
};

export function mockSample(hint: DocTypeHint): RawExtraction {
  return structuredClone(SAMPLES[hint === "auto" ? "invoice" : hint]);
}

export async function extractWithMock(req: ProviderRequest): Promise<ProviderResponse> {
  // A short pause so loading states are visible while developing.
  await new Promise((resolve) => setTimeout(resolve, Number(process.env.MOCK_DELAY_MS ?? 600)));
  return {
    raw: mockSample(req.hint),
    truncated: false,
    provider: "mock",
    model: "mock",
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0,
  };
}
