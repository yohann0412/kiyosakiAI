/**
 * Get a file ready to upload: phone photos are scaled down to what the model
 * can actually use (which also makes uploads fast on mobile data), and PDFs
 * too big for a single request are turned into page images in the browser.
 */

export interface PreparedDoc {
  name: string;
  kind: "pdf" | "image";
  /** What gets uploaded: one PDF, or one image per page. */
  parts: Blob[];
  /** Object URLs for the preview pane (one per page for images). */
  previews: string[];
  /** Bytes that will be uploaded. */
  bytes: number;
  note?: string;
}

export class PrepareError extends Error {}

const MAX_EDGE = 2200;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PrepareError(
      "This browser can't open that image. If it is an iPhone HEIC photo, share it as JPG (or take a screenshot of it) and upload that.",
    );
  }
}

function toJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new PrepareError("Couldn't process that image."))), "image/jpeg", quality),
  );
}

async function shrinkImage(file: Blob, budget: number): Promise<Blob> {
  const bitmap = await decode(file);
  const longEdge = Math.max(bitmap.width, bitmap.height);
  const smallEnough = longEdge <= MAX_EDGE && file.size <= Math.min(budget, 1_500_000);
  if (smallEnough && IMAGE_TYPES.includes(file.type)) {
    bitmap.close();
    return file;
  }
  let scale = Math.min(1, MAX_EDGE / longEdge);
  let quality = 0.86;
  let out: Blob | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new PrepareError("Couldn't process that image.");
    // White behind transparent PNGs, so text stays readable as JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    out = await toJpeg(canvas, quality);
    if (out.size <= budget) break;
    quality -= 0.08;
    scale *= 0.85;
  }
  bitmap.close();
  if (!out || out.size > budget) throw new PrepareError("That image is too large to upload, even after shrinking it.");
  return out;
}

async function rasterizePdf(file: File, maxPages: number, budget: number): Promise<{ parts: Blob[]; total: number }> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  let doc;
  try {
    doc = await task.promise;
  } catch {
    throw new PrepareError("We couldn't open that PDF. If it is password-protected, remove the password and try again.");
  }
  const count = Math.min(doc.numPages, maxPages);
  const perPage = Math.floor(budget / count);
  const parts: Blob[] = [];
  for (let n = 1; n <= count; n++) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    let scale = Math.min(3, 1800 / Math.max(base.width, base.height));
    let quality = 0.82;
    let blob: Blob | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new PrepareError("Couldn't process that PDF.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      blob = await toJpeg(canvas, quality);
      if (blob.size <= perPage) break;
      quality -= 0.08;
      scale *= 0.85;
    }
    if (!blob || blob.size > perPage) throw new PrepareError("That PDF is too large to convert in the browser. Try splitting it.");
    parts.push(blob);
  }
  const total = doc.numPages;
  await task.destroy();
  return { parts, total };
}

export function isPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

export function isSupported(file: File): boolean {
  return isPdf(file) || file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name);
}

/** One uploaded file -> one document. */
export async function prepareFile(file: File, maxBytes: number, maxPages: number): Promise<PreparedDoc> {
  if (!isSupported(file)) {
    throw new PrepareError("That file type isn't supported. Upload a PDF, JPG, PNG or WebP.");
  }
  if (isPdf(file)) {
    if (file.size <= maxBytes) {
      return { name: file.name, kind: "pdf", parts: [file], previews: [URL.createObjectURL(file)], bytes: file.size };
    }
    const { parts, total } = await rasterizePdf(file, maxPages, maxBytes);
    return {
      name: file.name,
      kind: "image",
      parts,
      previews: parts.map((part) => URL.createObjectURL(part)),
      bytes: parts.reduce((n, part) => n + part.size, 0),
      note:
        total > parts.length
          ? `This PDF has ${total} pages; the first ${parts.length} were converted.`
          : undefined,
    };
  }
  const image = await shrinkImage(file, maxBytes);
  return { name: file.name, kind: "image", parts: [image], previews: [URL.createObjectURL(image)], bytes: image.size };
}

/** Several photos that are the pages of one document. */
export async function preparePages(files: File[], maxBytes: number): Promise<PreparedDoc> {
  const budget = Math.floor(maxBytes / files.length);
  const parts: Blob[] = [];
  for (const file of files) parts.push(await shrinkImage(file, budget));
  return {
    name: files[0].name,
    kind: "image",
    parts,
    previews: parts.map((part) => URL.createObjectURL(part)),
    bytes: parts.reduce((n, part) => n + part.size, 0),
  };
}

export function releasePreviews(doc: PreparedDoc | null) {
  doc?.previews.forEach((url) => URL.revokeObjectURL(url));
}
