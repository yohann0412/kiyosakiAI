import { createRequire } from "node:module";
import sharp from "sharp";
import { renderHtml } from "./templates";
import type { DocDef, Effects } from "./types";

/**
 * Turns a document definition into the file a user would upload: a digital
 * PDF, a flatbed scan, a fax, or a phone photo taken at an angle.
 *
 * Needs Playwright with Chromium. In the cloud dev container it is installed
 * globally: run with NODE_PATH set to the global node_modules folder.
 */
const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Browser = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Page = any;

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browser) return browser;
  let playwright;
  try {
    playwright = require("playwright");
  } catch {
    throw new Error("Playwright is not available. Set NODE_PATH to the global node_modules folder, or install playwright.");
  }
  browser = await playwright.chromium.launch();
  return browser;
}

export async function closeBrowser() {
  await browser?.close();
  browser = null;
}

export interface Rendered {
  data: Buffer;
  ext: "pdf" | "jpg";
  mediaType: "application/pdf" | "image/jpeg";
}

/** Seeded PRNG so every run of the generator produces the same files. */
function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

async function pagePngs(def: DocDef, scale: number): Promise<Buffer[]> {
  const b = await getBrowser();
  const context = await b.newContext({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: scale });
  const page: Page = await context.newPage();
  await page.setContent(renderHtml(def), { waitUntil: "load" });
  await page.evaluate(() => (document as Document).fonts.ready);
  const pages = await page.$$(".page");
  const out: Buffer[] = [];
  for (const element of pages) out.push(await element.screenshot({ type: "png" }));
  await context.close();
  return out;
}

async function noiseLayer(width: number, height: number, sigma: number, seed: string): Promise<Buffer> {
  // sharp's own noise is not seedable, so build it from the seeded PRNG.
  const random = rng(seed);
  const w = Math.ceil(width / 2);
  const h = Math.ceil(height / 2);
  const raw = Buffer.alloc(w * h);
  for (let i = 0; i < raw.length; i++) {
    // Sum of uniforms approximates a gaussian.
    const g = (random() + random() + random() + random() - 2) * sigma * 1.7;
    raw[i] = Math.max(0, Math.min(255, Math.round(128 + g)));
  }
  return sharp(raw, { raw: { width: w, height: h, channels: 1 } }).resize(width, height, { kernel: "cubic" }).png().toBuffer();
}

/**
 * Overlay sensor noise. Returns a finished PNG: sharp resizes before it
 * composites, so any later resize has to happen in a separate pipeline.
 */
async function withNoise(image: Buffer, sigma: number, seed: string): Promise<Buffer> {
  const meta = await sharp(image).metadata();
  const layer = await noiseLayer(meta.width!, meta.height!, sigma, seed);
  return sharp(image).composite([{ input: layer, blend: "overlay" }]).png().toBuffer();
}

/** Flatbed scan: greyish paper, slight skew, soft focus, sensor noise, JPEG artefacts. */
async function scan(png: Buffer, fx: Effects, seed: string): Promise<Buffer> {
  const fade = fx.fade ?? 0;
  const rotated = await sharp(png)
    .flatten({ background: "#ffffff" })
    .rotate(fx.rotate ?? 0.7, { background: "#e9e9e6" })
    .modulate({ brightness: 0.97 })
    .linear(1 - fade * 0.55, fade * 110)
    .blur(fx.blur ?? 0.5)
    .png()
    .toBuffer();
  const noisy = await withNoise(rotated, fx.noise ?? 16, seed);
  return sharp(noisy)
    .resize({ width: 1700, height: 2200, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: fx.quality ?? 68 })
    .toBuffer();
}

/** Fax: low resolution, pure black and white, specks, skew. */
async function fax(png: Buffer, fx: Effects, seed: string): Promise<Buffer> {
  const small = await sharp(png)
    .flatten({ background: "#ffffff" })
    .resize({ width: 1150 })
    .rotate(fx.rotate ?? -1.1, { background: "#ffffff" })
    .greyscale()
    .blur(0.4)
    .png()
    .toBuffer();
  const noisy = await sharp(await withNoise(small, fx.noise ?? 38, seed)).greyscale().threshold(150).png().toBuffer();
  return sharp(noisy).resize({ width: 1700, kernel: "nearest" }).jpeg({ quality: fx.quality ?? 60 }).toBuffer();
}

const DESKS: Record<string, string> = {
  wood: "linear-gradient(100deg,#8a6a48 0%,#9b7a55 18%,#86663f 37%,#a07e58 55%,#8d6c47 74%,#9a7852 100%)",
  dark: "linear-gradient(135deg,#2b2f33,#3a3f45 55%,#25282c)",
  grey: "linear-gradient(120deg,#b9bcc0,#cfd2d5 50%,#aeb1b5)",
  cardboard: "linear-gradient(95deg,#b08d62,#c09c70 40%,#a98558 70%,#b9956a)",
};

/** Phone photo: the page lying on a surface, shot at an angle under uneven light. */
async function photo(png: Buffer, fx: Effects, seed: string): Promise<Buffer> {
  const b = await getBrowser();
  const meta = await sharp(png).metadata();
  const ratio = meta.height! / meta.width!;
  const paperWidth = ratio > 1.8 ? 520 : 1000;
  const paperHeight = Math.round(paperWidth * ratio);
  const viewW = paperWidth + 520;
  const viewH = paperHeight + 420;
  const context = await b.newContext({ viewport: { width: viewW, height: viewH }, deviceScaleFactor: 1.6 });
  const page: Page = await context.newPage();
  const src = "data:image/png;base64," + png.toString("base64");
  const tilt = "rotateX(" + (fx.tiltX ?? 14) + "deg) rotateY(" + (fx.tiltY ?? -5) + "deg) rotateZ(" + (fx.tiltZ ?? -3) + "deg)";
  const contrast = 1 - (fx.fade ?? 0) * 0.5;
  const handShadow =
    fx.shadow === false
      ? ""
      : '<div style="position:absolute;right:-6%;bottom:-4%;width:58%;height:46%;background:radial-gradient(ellipse at 80% 85%,rgba(0,0,0,.34),rgba(0,0,0,0) 70%)"></div>';
  const html =
    '<!doctype html><html><body style="margin:0;width:' + viewW + "px;height:" + viewH + "px;overflow:hidden;background:" + DESKS[fx.desk ?? "wood"] +
    ';display:flex;align-items:center;justify-content:center;perspective:2100px">' +
    '<div style="position:relative;width:' + paperWidth + "px;height:" + paperHeight + "px;transform:" + tilt + ';box-shadow:14px 22px 50px rgba(0,0,0,.42)">' +
    '<img src="' + src + '" style="width:100%;height:100%;display:block;filter:brightness(.97) contrast(' + contrast + ')">' +
    '<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 28% 18%,rgba(255,250,235,0) 0%,rgba(60,45,20,.20) 100%);mix-blend-mode:multiply"></div>' +
    handShadow +
    "</div></body></html>";
  await page.setContent(html, { waitUntil: "load" });
  const shot: Buffer = await page.screenshot({ type: "png" });
  await context.close();
  const soft = await sharp(shot).blur(fx.blur ?? 0.7).png().toBuffer();
  const noisy = await withNoise(soft, fx.noise ?? 14, seed);
  return sharp(noisy)
    .resize({ width: 2100, height: 2100, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: fx.quality ?? 74 })
    .toBuffer();
}

/**
 * Render one definition. Multi-page documents come back as a PDF; scans and
 * photos of multi-page documents come back as one image per page.
 */
export async function renderDoc(def: DocDef): Promise<Rendered[]> {
  const fx = def.effects ?? {};
  if (def.capture === "pdf") {
    const b = await getBrowser();
    const context = await b.newContext();
    const page: Page = await context.newPage();
    await page.setContent(renderHtml(def), { waitUntil: "load" });
    await page.evaluate(() => (document as Document).fonts.ready);
    const narrow = def.docType === "receipt";
    const data: Buffer = await page.pdf(
      narrow
        ? { width: "4.2in", height: "11in", printBackground: true }
        : { format: "Letter", printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } },
    );
    await context.close();
    return [{ data, ext: "pdf", mediaType: "application/pdf" }];
  }

  const pngs = await pagePngs(def, 2);
  const out: Rendered[] = [];
  for (const [i, png] of pngs.entries()) {
    const seed = def.id + ":" + i;
    const data =
      def.capture === "scan" ? await scan(png, fx, seed) : def.capture === "fax" ? await fax(png, fx, seed) : await photo(png, fx, seed);
    out.push({ data, ext: "jpg", mediaType: "image/jpeg" });
  }
  return out;
}

/** A JPEG of the first page as the user would see it (used for the sample shown on pages). */
export async function renderPreview(def: DocDef): Promise<Buffer> {
  const rendered = await renderDoc(def);
  if (rendered[0].ext === "jpg") return rendered[0].data;
  const pngs = await pagePngs(def, 1.6);
  return sharp(pngs[0]).flatten({ background: "#ffffff" }).jpeg({ quality: 82 }).toBuffer();
}
