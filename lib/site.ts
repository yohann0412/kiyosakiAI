/**
 * Site identity. Change the name here or with SITE_NAME; nothing else in the
 * code hard-codes it.
 */
function resolveUrl(): string {
  const explicit = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export const site = {
  name: process.env.SITE_NAME || process.env.NEXT_PUBLIC_SITE_NAME || "Sheetlift",
  url: resolveUrl(),
  tagline: "Paperwork in, spreadsheet out",
  description:
    "Free tool that turns a photo or PDF of an invoice, packing slip, bill of lading, purchase order, receipt or handwritten order into a clean Excel or CSV file.",
  /** Shown in the footer and privacy page when set. */
  contactEmail: process.env.CONTACT_EMAIL || process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  /** Google Search Console verification token, when set. */
  googleVerification: process.env.GOOGLE_SITE_VERIFICATION || "",
};
