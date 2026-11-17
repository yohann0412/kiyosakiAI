import fs from "node:fs";
import path from "node:path";
import type { FontId, HandId } from "./types";

const PACKAGES: Record<FontId | HandId, { pkg: string; family: string; weights: number[]; fallback: string }> = {
  inter: { pkg: "inter", family: "Inter", weights: [400, 600, 700], fallback: "sans-serif" },
  roboto: { pkg: "roboto", family: "Roboto", weights: [400, 500, 700], fallback: "sans-serif" },
  plex: { pkg: "ibm-plex-sans", family: "IBM Plex Sans", weights: [400, 600, 700], fallback: "sans-serif" },
  serif: { pkg: "source-serif-4", family: "Source Serif 4", weights: [400, 600, 700], fallback: "serif" },
  condensed: { pkg: "roboto-condensed", family: "Roboto Condensed", weights: [400, 700], fallback: "sans-serif" },
  courier: { pkg: "courier-prime", family: "Courier Prime", weights: [400, 700], fallback: "monospace" },
  mono: { pkg: "share-tech-mono", family: "Share Tech Mono", weights: [400], fallback: "monospace" },
  patrick: { pkg: "patrick-hand", family: "Patrick Hand", weights: [400], fallback: "cursive" },
  kalam: { pkg: "kalam", family: "Kalam", weights: [400], fallback: "cursive" },
  caveat: { pkg: "caveat", family: "Caveat", weights: [500], fallback: "cursive" },
  indie: { pkg: "indie-flower", family: "Indie Flower", weights: [400], fallback: "cursive" },
  gloria: { pkg: "gloria-hallelujah", family: "Gloria Hallelujah", weights: [400], fallback: "cursive" },
  shadows: { pkg: "shadows-into-light", family: "Shadows Into Light", weights: [400], fallback: "cursive" },
  reenie: { pkg: "reenie-beanie", family: "Reenie Beanie", weights: [400], fallback: "cursive" },
  nothing: { pkg: "nothing-you-could-do", family: "Nothing You Could Do", weights: [400], fallback: "cursive" },
  homemade: { pkg: "homemade-apple", family: "Homemade Apple", weights: [400], fallback: "cursive" },
};

export function fontFamily(id: FontId | HandId): string {
  const font = PACKAGES[id];
  return `"${font.family}", ${font.fallback}`;
}

/** @font-face rules with the font files inlined, so rendering needs no network. */
export function fontCss(ids: (FontId | HandId)[]): string {
  const rules: string[] = [];
  for (const id of new Set(ids)) {
    const font = PACKAGES[id];
    for (const weight of font.weights) {
      const file = path.join(process.cwd(), "node_modules", "@fontsource", font.pkg, "files", `${font.pkg}-latin-${weight}-normal.woff2`);
      if (!fs.existsSync(file)) throw new Error(`font file missing: ${file}`);
      const data = fs.readFileSync(file).toString("base64");
      rules.push(
        `@font-face{font-family:"${font.family}";font-weight:${weight};font-style:normal;src:url(data:font/woff2;base64,${data}) format("woff2");}`,
      );
    }
  }
  return rules.join("\n");
}
