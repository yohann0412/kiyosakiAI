import { OG_SIZE, ogImage } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Turn paperwork into a spreadsheet";

export default function Image() {
  return ogImage("Paperwork in, spreadsheet out", "Invoices, packing slips, bills of lading, purchase orders, receipts and handwritten orders to Excel or CSV.");
}
