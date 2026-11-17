import { PDFDocument } from "pdf-lib";
import { ExtractorError } from "./types";

export interface PreparedPdf {
  data: Uint8Array;
  /** Pages in the original file. */
  totalPages: number;
  /** Pages actually sent for extraction. */
  pages: number;
}

/**
 * Count the pages of a PDF and, when it is longer than the cap, keep only the
 * first `maxPages`. Encrypted or damaged files are rejected with a message the
 * user can act on.
 */
export async function preparePdf(data: Uint8Array, maxPages: number): Promise<PreparedPdf> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(data, { updateMetadata: false });
  } catch {
    throw new ExtractorError(
      "unreadable_file",
      "We couldn't open that PDF. If it is password-protected, remove the password (or print it to a new PDF) and try again.",
    );
  }
  const totalPages = doc.getPageCount();
  if (totalPages === 0) {
    throw new ExtractorError("unreadable_file", "That PDF has no pages.");
  }
  if (totalPages <= maxPages) return { data, totalPages, pages: totalPages };

  const trimmed = await PDFDocument.create();
  const indices = Array.from({ length: maxPages }, (_, i) => i);
  const copied = await trimmed.copyPages(doc, indices);
  for (const page of copied) trimmed.addPage(page);
  return { data: await trimmed.save(), totalPages, pages: maxPages };
}
