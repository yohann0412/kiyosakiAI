/**
 * ONE-TIME BOOTSTRAP of eval/golden_docs. Do not run this again.
 *
 * program.md says the agent may not edit anything in eval/. This script
 * created the first golden set on 2026-11-17 because the repo started empty
 * and the nightly loop needs a fixed yardstick. It refuses to run once
 * eval/MANIFEST.sha256 exists, and `npm run eval:guard` fails if any file
 * under eval/ changes afterwards.
 *
 * Replacing or extending the golden set is the human's job: add real
 * (redacted) documents under eval/golden_docs/<id>/ with an expected.json in
 * the same shape, then run `npm run eval:guard -- --reseal`.
 */
import fs from "node:fs";
import path from "node:path";
import { GOLDEN_DEFS } from "../eval/source/golden-defs";
import { closeBrowser, renderDoc } from "./docgen/render";
import { validateDef } from "./docgen/templates";
import { sealEval } from "./eval-lib";

const root = path.join(process.cwd(), "eval");
const outDir = path.join(root, "golden_docs");

async function main() {
  if (fs.existsSync(path.join(root, "MANIFEST.sha256"))) {
    console.error("eval/ is already sealed. The golden set is frozen; this script does not run twice.");
    process.exit(1);
  }
  const problems = GOLDEN_DEFS.flatMap(validateDef);
  if (problems.length) throw new Error(problems.join("\n"));

  for (const def of GOLDEN_DEFS) {
    const dir = path.join(outDir, def.id);
    fs.mkdirSync(dir, { recursive: true });
    const rendered = await renderDoc(def);
    const files: string[] = [];
    rendered.forEach((file, i) => {
      const name = rendered.length === 1 ? `document.${file.ext}` : `page-${i + 1}.${file.ext}`;
      fs.writeFileSync(path.join(dir, name), file.data);
      files.push(name);
    });
    const expected = {
      id: def.id,
      docType: def.docType,
      capture: def.capture,
      difficulty: def.difficulty,
      about: def.about,
      files,
      fields: def.fields,
      tables: [
        { name: "main", columns: def.columns.map((c) => ({ key: c.key, label: c.label })), rows: def.rows },
        ...(def.secondary
          ? [{ name: def.secondary.name, columns: def.secondary.columns.map((c) => ({ key: c.key, label: c.label })), rows: def.secondary.rows }]
          : []),
      ],
    };
    fs.writeFileSync(path.join(dir, "expected.json"), JSON.stringify(expected, null, 1) + "\n");
    const size = rendered.reduce((n, file) => n + file.data.length, 0);
    console.log(`${def.id.padEnd(26)} ${def.capture.padEnd(6)} ${String(def.rows.length).padStart(3)} rows  ${Math.round(size / 1024)} KB`);
  }
  await closeBrowser();
  const count = sealEval();
  console.log(`sealed ${count} files in eval/MANIFEST.sha256`);
}

main().catch(async (error) => {
  console.error(error);
  await closeBrowser();
  process.exit(1);
});
