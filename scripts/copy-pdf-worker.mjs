// Copies the pdf.js worker into public/ so the browser can load it from our
// own origin. Runs after install and before every build.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const source = path.join(path.dirname(require.resolve("pdfjs-dist/package.json")), "build", "pdf.worker.min.mjs");
mkdirSync("public", { recursive: true });
copyFileSync(source, path.join("public", "pdf.worker.min.mjs"));
