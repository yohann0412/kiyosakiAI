import { DOC_TYPES } from "@/core/extractor/doctypes";
import { columnType, esc, fieldType, show } from "./format";
import { fontCss, fontFamily } from "./fonts";
import type { ColumnDef, DocDef } from "./types";

/**
 * HTML for each kind of document. The same definition drives the printed
 * page and the expected output, so the ground truth is exact by construction.
 */

const HAND_DEFAULT = "patrick";

function label(def: DocDef, key: string, fallback: string): string {
  return esc(def.labels?.[key] ?? fallback);
}

function field(def: DocDef, key: string, symbol = true): string {
  const value = def.fields[key];
  if (value === undefined) return "";
  return esc(show(value, fieldType(def.docType, key), def.look, symbol));
}

function has(def: DocDef, key: string): boolean {
  return def.fields[key] !== undefined && def.fields[key] !== "";
}

/** "12 Main St, Suite 4, Portland, OR 97201" -> street lines, then "City, ST ZIP". */
function addressLines(value: string | undefined): string {
  if (!value) return "";
  const parts = value.split(", ");
  if (parts.length <= 2) return esc(value);
  const tail = parts.slice(-2).join(", ");
  return [...parts.slice(0, -2), tail].map(esc).join("<br>");
}

function cell(def: DocDef, column: ColumnDef, value: string, rowIndex: number): string {
  const type = columnType(def.docType, column.key);
  const shown = esc(show(value, type, def.look, false));
  const edit = def.handEdits?.find((e) => e.row === rowIndex && e.column === column.key);
  if (edit) {
    return `<span class="struck">${esc(show(edit.printed, type, def.look, false))}</span><span class="hand fix">${shown}</span>`;
  }
  return shown;
}

function alignClass(column: ColumnDef, def: DocDef): string {
  if (column.align) return column.align;
  const type = columnType(def.docType, column.key);
  return type === "money" || type === "number" ? "r" : "";
}

function itemsTable(def: DocDef, rows: string[][], offset: number, extraRows = ""): string {
  const head = def.columns
    .map((c) => `<th class="${alignClass(c, def)}" style="${c.w ? `width:${c.w}%` : ""}">${esc(c.label)}</th>`)
    .join("");
  const body = rows
    .map(
      (row, r) =>
        `<tr>${def.columns.map((c, i) => `<td class="${alignClass(c, def)}">${cell(def, c, row[i] ?? "", offset + r)}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table class="items ruled-${def.look.ruled}"><thead><tr>${head}</tr></thead><tbody>${body}${extraRows}</tbody></table>`;
}

function chunk<T>(rows: T[], size?: number): T[][] {
  if (!size || rows.length <= size) return [rows];
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

function baseCss(def: DocDef): string {
  const hand = def.look.hand ?? HAND_DEFAULT;
  return `
${fontCss([def.look.font, hand])}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#fff}
body{font-family:${fontFamily(def.look.font)};font-size:12.5px;line-height:1.38;color:#1b1f23;-webkit-font-smoothing:antialiased;font-feature-settings:"calt" 0,"liga" 0;font-variant-ligatures:none}
.page{width:816px;min-height:1056px;padding:46px 50px 40px;background:#fff;position:relative;page-break-after:always;break-after:page;display:flex;flex-direction:column}
.page:last-child{page-break-after:auto;break-after:auto}
h1{font-size:30px;letter-spacing:.04em;font-weight:700;color:${def.look.accent}}
.muted{color:#5d6670}
.small{font-size:10.5px}
.r{text-align:right}.c{text-align:center}
.co{font-size:18px;font-weight:700}
.logo{width:44px;height:44px;border-radius:9px;background:${def.look.accent};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:20px;flex:none}
.top{display:flex;justify-content:space-between;gap:24px;align-items:flex-start}
.brand{display:flex;gap:12px;align-items:flex-start}
.meta td{padding:1.5px 0 1.5px 14px}
.meta td:first-child{color:#5d6670;padding-left:0;white-space:nowrap}
.meta td:last-child{font-weight:600;text-align:right}
.parties{display:flex;gap:28px;margin:26px 0 20px}
.parties>div{flex:1}
.cap{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:#5d6670;font-weight:700;margin-bottom:4px}
table{border-collapse:collapse;width:100%}
.items th{font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;text-align:left;padding:7px 8px;background:${def.look.accent};color:#fff;font-weight:700}
.items th.r{text-align:right}.items th.c{text-align:center}
.items td{padding:6.5px 8px;vertical-align:top}
.items.ruled-full td,.items.ruled-full th{border:1px solid #9aa3ab}
.items.ruled-rows td{border-bottom:1px solid #d5dae0}
.items.ruled-none th{background:none;color:#1b1f23;border-bottom:1.5px solid #1b1f23;padding-left:0}
.items.ruled-none td{padding-left:0}
.items tr.note td{color:#5d6670;font-style:italic}
.totals{margin-top:14px;margin-left:auto;width:290px}
.totals td{padding:3.5px 8px}
.totals td:last-child{text-align:right;font-variant-numeric:tabular-nums}
.totals tr.grand td{font-weight:700;font-size:14.5px;border-top:1.5px solid #1b1f23;padding-top:7px}
.footer{margin-top:auto;padding-top:20px;color:#5d6670;font-size:10.5px;border-top:1px solid #d5dae0}
.footer p{margin-top:3px}
.pageno{position:absolute;bottom:18px;right:50px;font-size:10px;color:#5d6670}
.box{border:1px solid #9aa3ab;padding:8px 10px}
.hand{font-family:${fontFamily(hand)};color:${def.look.ink ?? "#1c2f7a"};font-size:1.55em;line-height:1}
.struck{text-decoration:line-through;text-decoration-thickness:1.5px;text-decoration-color:${def.look.ink ?? "#1c2f7a"};margin-right:5px}
.fix{display:inline-block;transform:rotate(-4deg) translateY(-2px)}
`;
}

function wrap(def: DocDef, body: string, extraCss = ""): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseCss(def)}${extraCss}</style></head><body>${body}</body></html>`;
}

function footer(def: DocDef): string {
  if (!def.footer?.length) return "";
  return `<div class="footer">${def.footer.map((line) => `<p>${esc(line)}</p>`).join("")}</div>`;
}

function metaRows(def: DocDef, items: [string, string][]): string {
  return items
    .filter(([key]) => has(def, key))
    .map(([key, fallback]) => `<tr><td>${label(def, key, fallback)}</td><td>${field(def, key)}</td></tr>`)
    .join("");
}

function extraRows(def: DocDef): string {
  return (def.extras ?? []).map((x) => `<tr><td>${esc(x.label)}</td><td>${esc(x.value)}</td></tr>`).join("");
}

function totalsBlock(def: DocDef, items: [string, string][], grandKey: string): string {
  const rows = items
    .filter(([key]) => has(def, key))
    .map(([key, fallback]) => {
      const negative = key === "discount_total" && !def.fields[key].startsWith("-");
      return `<tr class="${key === grandKey ? "grand" : ""}"><td>${label(def, key, fallback)}</td><td>${negative ? "-" : ""}${field(def, key)}</td></tr>`;
    })
    .join("");
  return rows ? `<table class="totals">${rows}</table>` : "";
}

// ---------------------------------------------------------------- invoice --

function invoice(def: DocDef): string {
  const pages = chunk(def.rows, def.rowsPerPage);
  const modern = def.look.layout === "modern";
  const header = `
  <div class="top">
    <div class="brand">
      ${modern ? "" : `<div class="logo">${esc(def.fields.vendor_name?.[0] ?? "V")}</div>`}
      <div>
        <div class="co">${field(def, "vendor_name")}</div>
        <div class="muted">${addressLines(def.fields.vendor_address)}</div>
        ${has(def, "vendor_tax_id") ? `<div class="muted">${label(def, "vendor_tax_id", "Tax ID")}: ${field(def, "vendor_tax_id")}</div>` : ""}
      </div>
    </div>
    <div class="r">
      <h1>${esc(def.labels?.title ?? "INVOICE")}</h1>
      <table class="meta" style="width:auto;margin-left:auto;margin-top:8px">
        ${metaRows(def, [
          ["invoice_number", "Invoice #"],
          ["invoice_date", "Invoice date"],
          ["due_date", "Due date"],
          ["po_number", "PO #"],
          ["payment_terms", "Terms"],
          ["currency", "Currency"],
        ])}
        ${extraRows(def)}
      </table>
    </div>
  </div>
  <div class="parties">
    <div><div class="cap">${label(def, "customer_name", "Bill to")}</div><strong>${field(def, "customer_name")}</strong><br>${addressLines(def.fields.bill_to_address)}</div>
    ${has(def, "ship_to_address") ? `<div><div class="cap">${label(def, "ship_to_address", "Ship to")}</div>${addressLines(def.fields.ship_to_address)}</div>` : ""}
  </div>`;

  const totals = totalsBlock(
    def,
    [
      ["subtotal", "Subtotal"],
      ["discount_total", "Discount"],
      ["tax_total", "Sales tax"],
      ["shipping_total", "Shipping"],
      ["total", "Total"],
      ["amount_due", "Amount due"],
    ],
    "total",
  );

  let offset = 0;
  const html = pages
    .map((rows, p) => {
      const last = p === pages.length - 1;
      const carried =
        !last && pages.length > 1
          ? `<tr class="note"><td colspan="${def.columns.length}" class="r">Continued on next page</td></tr>`
          : "";
      const table = itemsTable(def, rows, offset, carried);
      offset += rows.length;
      return `<div class="page">
        ${p === 0 ? header : `<div class="top"><div class="co">${field(def, "vendor_name")}</div><div class="muted">${label(def, "invoice_number", "Invoice #")} ${field(def, "invoice_number")} (continued)</div></div><div style="height:18px"></div>`}
        ${table}
        ${last ? totals : ""}
        ${last ? footer(def) : ""}
        ${pages.length > 1 ? `<div class="pageno">Page ${p + 1} of ${pages.length}</div>` : ""}
      </div>`;
    })
    .join("");

  const modernCss = modern
    ? `.page{border-top:14px solid ${def.look.accent}} h1{font-size:38px;letter-spacing:-.01em;font-weight:700} .items th{background:#eef1f4;color:#1b1f23}`
    : "";
  return wrap(def, html, modernCss);
}

// ------------------------------------------------------------ packing slip --

function packingSlip(def: DocDef): string {
  const info: [string, string][] = [
    ["packing_slip_number", "Packing slip #"],
    ["order_number", "Order #"],
    ["po_number", "Customer PO"],
    ["ship_date", "Ship date"],
    ["carrier", "Carrier"],
    ["ship_method", "Service"],
    ["tracking_number", "Tracking #"],
  ];
  const infoCells = [
    ...info.filter(([key]) => has(def, key)).map(([key, fallback]) => [label(def, key, fallback), field(def, key)]),
    ...(def.extras ?? []).map((x) => [esc(x.label), esc(x.value)]),
  ];
  const totals = [
    has(def, "total_packages") ? `${label(def, "total_packages", "Total cartons")}: <strong>${field(def, "total_packages")}</strong>` : "",
    has(def, "total_weight") ? `${label(def, "total_weight", "Total weight")}: <strong>${field(def, "total_weight")}</strong>` : "",
  ]
    .filter(Boolean)
    .join(" &nbsp;&nbsp;|&nbsp;&nbsp; ");

  const html = `<div class="page">
    <div class="top">
      <div class="brand"><div class="logo">${esc(def.fields.shipper_name?.[0] ?? "S")}</div><div><div class="co">${field(def, "shipper_name")}</div><div class="muted">${addressLines(def.fields.ship_from_address)}</div></div></div>
      <div class="r"><h1>${esc(def.labels?.title ?? "PACKING SLIP")}</h1></div>
    </div>
    <div class="parties">
      <div><div class="cap">${label(def, "ship_to_name", "Ship to")}</div><strong>${field(def, "ship_to_name")}</strong><br>${addressLines(def.fields.ship_to_address)}</div>
      <div><table class="meta">${infoCells.map(([l, v]) => `<tr><td>${l}</td><td>${v}</td></tr>`).join("")}</table></div>
    </div>
    ${itemsTable(def, def.rows, 0)}
    ${totals ? `<p style="margin-top:14px" class="r">${totals}</p>` : ""}
    ${footer(def)}
  </div>`;
  return wrap(def, html);
}

// ---------------------------------------------------------- bill of lading --

function billOfLading(def: DocDef): string {
  const terms = def.fields.freight_terms ?? "";
  const box = (name: string) => `<span class="chk">${terms.toLowerCase() === name.toLowerCase() ? "X" : "&nbsp;"}</span> ${name}`;
  const sec = def.secondary;
  const f = (key: string) => field(def, key);

  const orderTable = sec
    ? `<div class="band">CUSTOMER ORDER INFORMATION</div>
      <table class="grid"><thead><tr>${sec.columns.map((c) => `<th class="${c.align ?? ""}" style="${c.w ? `width:${c.w}%` : ""}">${esc(c.label)}</th>`).join("")}</tr></thead>
      <tbody>${sec.rows.map((row) => `<tr>${sec.columns.map((c, i) => `<td class="${c.align ?? ""}">${esc(row[i] ?? "")}</td>`).join("")}</tr>`).join("")}
      </tbody></table>`
    : "";

  const col = (key: string) => def.columns.find((c) => c.key === key);
  const carrierHead = `
    <tr>
      ${col("handling_unit_qty") ? `<th colspan="2" class="c">HANDLING UNIT</th>` : ""}
      ${col("package_qty") ? `<th colspan="2" class="c">PACKAGE</th>` : ""}
      ${col("weight") ? `<th rowspan="2" class="c">WEIGHT<br>(LBS)</th>` : ""}
      ${col("hazmat") ? `<th rowspan="2" class="c">H.M.<br>(X)</th>` : ""}
      <th rowspan="2">COMMODITY DESCRIPTION<div class="tiny">Commodities requiring special or additional care or attention in handling or stowing must be so marked and packaged as to ensure safe transportation with ordinary care.</div></th>
      ${col("nmfc") ? `<th colspan="2" class="c">LTL ONLY</th>` : ""}
    </tr>
    <tr>
      ${col("handling_unit_qty") ? `<th class="c">QTY</th><th class="c">TYPE</th>` : ""}
      ${col("package_qty") ? `<th class="c">QTY</th><th class="c">TYPE</th>` : ""}
      ${col("nmfc") ? `<th class="c">NMFC #</th><th class="c">CLASS</th>` : ""}
    </tr>`;
  const order = ["handling_unit_qty", "handling_unit_type", "package_qty", "package_type", "weight", "hazmat", "description", "nmfc", "class"].filter(col);
  const body = def.rows
    .map(
      (row, r) =>
        `<tr>${order
          .map((key) => {
            const c = col(key)!;
            const i = def.columns.indexOf(c);
            return `<td class="${key === "description" ? "" : "c"}">${cell(def, c, row[i] ?? "", r)}</td>`;
          })
          .join("")}</tr>`,
    )
    .join("");
  const totalRow = `<tr class="tot">${order
    .map((key) => {
      if (key === "handling_unit_qty") return `<td class="c">${f("total_handling_units")}</td>`;
      if (key === "package_qty") return `<td class="c">${f("total_packages")}</td>`;
      if (key === "weight") return `<td class="c">${esc((def.fields.total_weight ?? "").replace(/\s*lbs?$/i, "")).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</td>`;
      if (key === "description") return `<td><strong>GRAND TOTAL</strong></td>`;
      return `<td class="shade"></td>`;
    })
    .join("")}</tr>`;

  const css = `
  body{font-size:10.5px}
  .page{padding:34px 36px}
  .bolttl{display:flex;justify-content:space-between;align-items:center;border:1.5px solid #111;border-bottom:0;padding:6px 10px}
  .bolttl b{font-size:16px;letter-spacing:.02em}
  .cols{display:flex;border:1.5px solid #111}
  .cols>div{flex:1}
  .cols>div+div{border-left:1.5px solid #111}
  .band{background:#111;color:#fff;font-weight:700;font-size:10px;letter-spacing:.06em;padding:3px 8px;text-align:center}
  .blk{padding:6px 9px;min-height:74px;border-bottom:1px solid #111}
  .blk:last-child{border-bottom:0}
  .kv{display:flex;gap:6px;padding:4px 9px;border-bottom:1px solid #111;min-height:24px;align-items:center}
  .kv span:first-child{color:#333;white-space:nowrap}
  .kv span:last-child{font-weight:700;font-size:12px}
  .chk{display:inline-flex;width:13px;height:13px;border:1.2px solid #111;align-items:center;justify-content:center;font-weight:700;font-size:10px;line-height:1;margin-left:8px;vertical-align:middle}
  .grid{border:1.5px solid #111;border-top:0}
  .grid th,.grid td{border:1px solid #111;padding:4px 6px;font-size:10.5px;vertical-align:middle}
  .grid th{background:#e9e9e9;font-size:9px;letter-spacing:.03em}
  .grid td{height:25px}
  .grid td.c{white-space:nowrap}
  .grid tr.tot td{font-weight:700;border-top:1.5px solid #111}
  .shade{background:#bdbdbd}
  .tiny{font-size:6.8px;font-weight:400;letter-spacing:0;text-transform:none;line-height:1.2;margin-top:2px}
  .sig{display:flex;border:1.5px solid #111;border-top:0;font-size:8px;line-height:1.25}
  .sig>div{flex:1;padding:6px 8px;min-height:74px}
  .sig>div+div{border-left:1px solid #111}
  .legal{border:1.5px solid #111;border-top:0;padding:5px 8px;font-size:7.5px;line-height:1.25;color:#222}
  `;

  const html = `<div class="page">
    <div class="bolttl"><span>Date: <b style="font-size:12px">${f("ship_date")}</b></span><b>BILL OF LADING</b><span>Page 1 of 1</span></div>
    <div class="cols">
      <div>
        <div class="band">SHIP FROM</div>
        <div class="blk"><strong>${f("shipper_name")}</strong><br>${addressLines(def.fields.shipper_address)}${(def.extras ?? []).filter((x) => x.label === "SID#").map((x) => `<br>SID#: ${esc(x.value)}`).join("")}</div>
        <div class="band">SHIP TO</div>
        <div class="blk"><strong>${f("consignee_name")}</strong><br>${addressLines(def.fields.consignee_address)}${(def.extras ?? []).filter((x) => x.label === "CID#").map((x) => `<br>CID#: ${esc(x.value)}`).join("")}</div>
        <div class="band">THIRD PARTY FREIGHT CHARGES BILL TO</div>
        <div class="blk" style="min-height:44px"><strong>${f("bill_to_name")}</strong>${(def.extras ?? []).filter((x) => x.label === "Bill to address").map((x) => `<br>${esc(x.value)}`).join("")}</div>
        <div class="kv" style="border-top:1px solid #111;border-bottom:0;min-height:40px;align-items:flex-start"><span>SPECIAL INSTRUCTIONS:</span><span style="font-weight:400;font-size:10.5px">${f("special_instructions")}</span></div>
      </div>
      <div>
        <div class="kv"><span>Bill of Lading Number:</span><span>${f("bol_number")}</span></div>
        <div class="kv"><span>CARRIER NAME:</span><span>${f("carrier_name")}</span></div>
        <div class="kv"><span>Trailer number:</span><span>${f("trailer_number")}</span></div>
        <div class="kv"><span>Seal number(s):</span><span>${f("seal_number")}</span></div>
        <div class="kv"><span>SCAC:</span><span>${f("scac")}</span></div>
        <div class="kv"><span>Pro number:</span><span>${f("pro_number")}</span></div>
        <div class="kv" style="flex-wrap:wrap;border-bottom:0;min-height:60px"><span style="width:100%"><strong>Freight Charge Terms:</strong> <span style="font-weight:400;font-size:8.5px">(freight charges are prepaid unless marked otherwise)</span></span>
          <span style="font-weight:400;font-size:10.5px">${box("Prepaid")} ${box("Collect")} ${box("3rd Party")}</span></div>
      </div>
    </div>
    ${orderTable}
    <div class="band">CARRIER INFORMATION</div>
    <table class="grid"><thead>${carrierHead}</thead><tbody>${body}${totalRow}</tbody></table>
    <div class="legal">Where the rate is dependent on value, shippers are required to state specifically in writing the agreed or declared value of the property. &nbsp; <strong>COD Amount: $ ${has(def, "cod_amount") ? f("cod_amount").replace("$", "") : "__________"}</strong> &nbsp; Fee terms: Collect <span class="chk">&nbsp;</span> Prepaid <span class="chk">&nbsp;</span></div>
    <div class="legal">Note: Liability limitation for loss or damage in this shipment may be applicable. See 49 USC § 14706(c)(1)(A) and (B). Received, subject to individually determined rates or contracts that have been agreed upon in writing between the carrier and shipper, if applicable, otherwise to the rates, classifications and rules that have been established by the carrier and are available to the shipper, on request.</div>
    <div class="sig">
      <div><strong>Shipper Signature/Date</strong><br>This is to certify that the above named materials are properly classified, packaged, marked and labeled, and are in proper condition for transportation according to the applicable regulations of the DOT.<br><span class="hand" style="font-size:20px">${esc((def.extras ?? []).find((x) => x.label === "Shipper signature")?.value ?? "")}</span></div>
      <div><strong>Trailer Loaded:</strong> <span class="chk">X</span> By shipper <span class="chk">&nbsp;</span> By driver<br><strong>Freight Counted:</strong> <span class="chk">X</span> By shipper <span class="chk">&nbsp;</span> By driver/pallets said to contain <span class="chk">&nbsp;</span> By driver/pieces</div>
      <div><strong>Carrier Signature/Pickup Date</strong><br>Carrier acknowledges receipt of packages and required placards.<br><span class="hand" style="font-size:20px">${esc((def.extras ?? []).find((x) => x.label === "Carrier signature")?.value ?? "")}</span></div>
    </div>
  </div>`;
  return wrap(def, html, css);
}

// ---------------------------------------------------------- purchase order --

function purchaseOrder(def: DocDef): string {
  const pages = chunk(def.rows, def.rowsPerPage);
  const strip: [string, string][] = [
    ["requested_by", "Requested by"],
    ["ship_method", "Ship via"],
    ["freight_terms", "FOB"],
    ["payment_terms", "Terms"],
    ["delivery_date", "Required by"],
  ];
  const stripCells = strip.filter(([key]) => has(def, key));
  const header = `
    <div class="top">
      <div class="brand"><div class="logo">${esc(def.fields.buyer_name?.[0] ?? "B")}</div><div><div class="co">${field(def, "buyer_name")}</div><div class="muted">${addressLines(def.fields.buyer_address)}</div></div></div>
      <div class="r"><h1>${esc(def.labels?.title ?? "PURCHASE ORDER")}</h1>
        <table class="meta" style="width:auto;margin-left:auto;margin-top:8px">${metaRows(def, [
          ["po_number", "PO number"],
          ["po_date", "Date"],
          ["currency", "Currency"],
        ])}${extraRows(def)}</table></div>
    </div>
    <div class="parties">
      <div class="box"><div class="cap">${label(def, "vendor_name", "Vendor")}</div><strong>${field(def, "vendor_name")}</strong><br>${addressLines(def.fields.vendor_address)}</div>
      <div class="box"><div class="cap">${label(def, "ship_to_name", "Ship to")}</div><strong>${field(def, "ship_to_name")}</strong><br>${addressLines(def.fields.ship_to_address)}</div>
    </div>
    ${
      stripCells.length
        ? `<table class="items ruled-full" style="margin-bottom:14px"><thead><tr>${stripCells.map(([key, fb]) => `<th>${label(def, key, fb)}</th>`).join("")}</tr></thead><tbody><tr>${stripCells.map(([key]) => `<td>${field(def, key)}</td>`).join("")}</tr></tbody></table>`
        : ""
    }`;
  const totals = totalsBlock(
    def,
    [
      ["subtotal", "Subtotal"],
      ["tax_total", "Tax"],
      ["shipping_total", "Freight"],
      ["total", "Total"],
    ],
    "total",
  );
  let offset = 0;
  const html = pages
    .map((rows, p) => {
      const last = p === pages.length - 1;
      const table = itemsTable(def, rows, offset);
      offset += rows.length;
      return `<div class="page">
        ${p === 0 ? header : `<div class="top"><div class="co">${field(def, "buyer_name")}</div><div class="muted">${label(def, "po_number", "PO number")} ${field(def, "po_number")} (continued)</div></div><div style="height:18px"></div>`}
        ${table}
        ${last ? totals : ""}
        ${last ? footer(def) : ""}
        ${pages.length > 1 ? `<div class="pageno">Page ${p + 1} of ${pages.length}</div>` : ""}
      </div>`;
    })
    .join("");
  return wrap(def, html);
}

// ----------------------------------------------------------------- receipt --

function receipt(def: DocDef): string {
  const idx = (key: string) => def.columns.findIndex((c) => c.key === key);
  const d = idx("description");
  const q = idx("quantity");
  const p = idx("unit_price");
  const a = idx("amount");
  const s = idx("sku");
  const columnsLayout = def.look.layout === "columns";
  const hand = (key: string) => Boolean(def.handFields?.includes(key));

  const lines = def.rows
    .map((row) => {
      const amount = a >= 0 ? row[a] : "";
      const desc = `${s >= 0 && row[s] ? row[s] + " " : ""}${row[d] ?? ""}`;
      if (columnsLayout) {
        return `<div class="ln"><span class="q">${esc(q >= 0 ? row[q] : "")}</span><span class="d">${esc(desc)}</span><span>${esc(amount)}</span></div>`;
      }
      const sub = q >= 0 && p >= 0 && row[q] && row[p] ? `<div class="ln sub"><span>&nbsp;&nbsp;${esc(row[q])} @ ${esc(row[p])}</span><span></span></div>` : "";
      return `<div class="ln"><span class="d">${esc(desc)}</span><span>${esc(amount)}</span></div>${sub}`;
    })
    .join("");

  const tot = (key: string, fallback: string, cls = "") => {
    if (!has(def, key)) return "";
    const value = hand(key) ? `<span class="hand" style="font-size:25px">${field(def, key, false)}</span>` : field(def, key, false);
    return `<div class="ln ${cls}"><span>${label(def, key, fallback)}</span><span>${value}</span></div>`;
  };

  const css = `
  html,body{background:#fff}
  body{font-size:13.5px;line-height:1.32;color:#161616}
  .page{width:${def.look.layout === "wide" ? 460 : 384}px;min-height:0;padding:26px 22px 30px;display:block}
  .cc{text-align:center}
  .nm{font-size:19px;font-weight:700;letter-spacing:.02em}
  .ln{display:flex;justify-content:space-between;gap:10px}
  .ln .d{flex:1}
  .ln .q{width:26px}
  .ln.sub{color:#333}
  .hr{border-top:1px dashed #333;margin:8px 0}
  .big{font-size:17px;font-weight:700}
  `;

  const html = `<div class="page">
    <div class="cc nm">${field(def, "merchant_name")}</div>
    <div class="cc">${addressLines(def.fields.merchant_address)}</div>
    ${has(def, "merchant_phone") ? `<div class="cc">${field(def, "merchant_phone")}</div>` : ""}
    <div class="hr"></div>
    <div class="ln"><span>${field(def, "date")}${has(def, "time") ? " " + field(def, "time") : ""}</span><span>${has(def, "receipt_number") ? `${label(def, "receipt_number", "Trans #")} ${field(def, "receipt_number")}` : ""}</span></div>
    ${(def.extras ?? []).map((x) => `<div class="ln"><span>${esc(x.label)}</span><span>${esc(x.value)}</span></div>`).join("")}
    <div class="hr"></div>
    ${columnsLayout ? `<div class="ln"><span class="q">QTY</span><span class="d">ITEM</span><span>AMOUNT</span></div>` : ""}
    ${lines}
    <div class="hr"></div>
    ${tot("subtotal", "SUBTOTAL")}
    ${tot("tax_total", "TAX")}
    ${tot("tip", "TIP")}
    ${tot("total", "TOTAL", "big")}
    <div class="hr"></div>
    ${has(def, "payment_method") ? `<div class="ln"><span>${field(def, "payment_method")}${has(def, "card_last4") ? " ************" + field(def, "card_last4") : ""}</span><span>${hand("total") ? "" : field(def, "total", false)}</span></div>` : ""}
    ${(def.footer ?? []).map((line) => `<div class="cc" style="margin-top:6px">${esc(line)}</div>`).join("")}
  </div>`;
  return wrap(def, html, css);
}

// -------------------------------------------------------------- order form --

function orderForm(def: DocDef): string {
  const hw = (text: string, size = 24) => `<span class="hand" style="font-size:${size}px">${esc(text)}</span>`;
  const line = (key: string, fallback: string, flex = 1) =>
    `<div class="fl" style="flex:${flex}"><span class="lb">${label(def, key, fallback)}</span><span class="ul">${has(def, key) ? hw(field(def, key, false)) : ""}</span></div>`;

  const struck = def.struckRows ?? [];
  const rowsHtml: string[] = [];
  def.rows.forEach((row, r) => {
    rowsHtml.push(
      `<tr>${def.columns
        .map((c, i) => {
          const ditto = def.dittos?.some((x) => x.row === r && x.column === c.key);
          const value = ditto ? "″" : show(row[i] ?? "", columnType(def.docType, c.key), def.look, false);
          return `<td class="${alignClass(c, def)}">${value ? hw(value, 23) : ""}</td>`;
        })
        .join("")}</tr>`,
    );
    for (const s of struck.filter((x) => x.after === r)) {
      rowsHtml.push(`<tr class="x">${def.columns.map((c, i) => `<td class="${alignClass(c, def)}">${s.cells[i] ? hw(s.cells[i], 23) : ""}</td>`).join("")}</tr>`);
    }
  });
  for (let i = 0; i < (def.blankRows ?? 4); i++) rowsHtml.push(`<tr>${def.columns.map(() => "<td></td>").join("")}</tr>`);

  const css = `
  .page{padding:40px 44px}
  .fl{display:flex;align-items:flex-end;gap:8px;min-height:34px}
  .lb{font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:#333;font-weight:700;white-space:nowrap;padding-bottom:3px}
  .ul{flex:1;border-bottom:1px solid #333;min-height:28px;padding:0 6px 1px}
  .rowf{display:flex;gap:18px;margin-top:6px}
  .form th{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;border:1.3px solid #222;padding:6px 6px;background:#ececec;text-align:center}
  .form td{border:1.3px solid #222;height:36px;padding:0 8px;vertical-align:middle}
  .form tr.x td{position:relative}
  .form tr.x td::after{content:"";position:absolute;left:-2px;right:-2px;top:52%;border-top:2.2px solid ${def.look.ink ?? "#1c2f7a"};transform:rotate(-.6deg)}
  .tots{margin-left:auto;margin-top:10px;width:250px}
  `;

  const totalLine = (key: string, fallback: string) =>
    has(def, key) ? `<div class="fl"><span class="lb" style="width:84px">${label(def, key, fallback)}</span><span class="ul" style="text-align:right">${hw(field(def, key, false))}</span></div>` : "";

  const html = `<div class="page">
    <div class="top" style="align-items:center">
      <div><div class="co" style="font-size:22px">${esc(def.labels?.company ?? "Order Form")}</div><div class="muted">${esc(def.labels?.companyLine ?? "")}</div></div>
      <div class="r"><h1 style="font-size:26px">${esc(def.labels?.title ?? "ORDER FORM")}</h1>${has(def, "order_number") ? `<div style="margin-top:4px">${label(def, "order_number", "No.")} <span style="color:#b3261e;font-size:18px;font-weight:700;font-family:monospace">${field(def, "order_number")}</span></div>` : ""}</div>
    </div>
    <div class="rowf" style="margin-top:22px">${line("customer_name", "Customer", 2)}${line("order_date", "Date")}</div>
    <div class="rowf">${line("customer_address", "Address", 2)}${line("customer_phone", "Phone")}</div>
    <div class="rowf">${line("delivery_date", "Deliver on")}${line("taken_by", "Taken by")}</div>
    <table class="form" style="margin-top:20px"><thead><tr>${def.columns.map((c) => `<th style="${c.w ? `width:${c.w}%` : ""}">${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${rowsHtml.join("")}</tbody></table>
    <div style="display:flex;gap:20px;align-items:flex-start">
      <div style="flex:1;margin-top:12px"><span class="lb">${label(def, "notes", "Notes")}</span><div class="ul" style="min-height:34px;margin-top:2px">${has(def, "notes") ? hw(def.fields.notes, 22) : ""}</div><div class="ul" style="min-height:30px"></div></div>
      <div class="tots">${totalLine("subtotal", "Subtotal")}${totalLine("tax_total", "Tax")}${totalLine("total", "Total")}</div>
    </div>
    ${footer(def)}
  </div>`;
  return wrap(def, html, css);
}

export function renderHtml(def: DocDef): string {
  switch (def.docType) {
    case "invoice":
      return invoice(def);
    case "packing_slip":
      return packingSlip(def);
    case "bill_of_lading":
      return billOfLading(def);
    case "purchase_order":
      return purchaseOrder(def);
    case "receipt":
      return receipt(def);
    case "order_form":
      return orderForm(def);
    default:
      throw new Error(`no template for ${def.docType}`);
  }
}

/** Sanity check a definition against the catalog before rendering. */
export function validateDef(def: DocDef): string[] {
  const problems: string[] = [];
  const spec = DOC_TYPES[def.docType];
  for (const key of Object.keys(def.fields)) {
    if (!spec.fields.some((f) => f.key === key)) problems.push(`${def.id}: field "${key}" is not in the ${def.docType} catalog`);
  }
  def.rows.forEach((row, r) => {
    if (row.length !== def.columns.length) problems.push(`${def.id}: row ${r + 1} has ${row.length} cells, expected ${def.columns.length}`);
  });
  return problems;
}
