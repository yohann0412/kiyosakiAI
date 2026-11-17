/**
 * Builds the sample documents shown on the search pages.
 *
 *   npm run samples                 render the images and run the real converter on each
 *   npm run samples -- --render-only   only (re)render the images
 *   npm run samples -- --only receipt
 *
 * For each sample this writes:
 *   public/samples/<id>.jpg    what the visitor sees (first page)
 *   public/samples/<id>.json   the converter's actual, unedited output
 *
 * The JSON is only written when the real extractor runs. Pages show the
 * "real example" block only when the JSON exists, so an example on the site
 * is always genuine output, never something typed in by hand.
 */
import fs from "node:fs";
import path from "node:path";
import { PROMPT_VERSION, extractDocument, extractorConfig, type ExtractionResult } from "@/core/extractor";
import { remoteConfigured, remoteExtract } from "./remote";
import { closeBrowser, renderDoc, renderPreview } from "./docgen/render";
import { SAMPLES } from "./docgen/samples";
import { validateDef } from "./docgen/templates";

const args = process.argv.slice(2);
const renderOnly = args.includes("--render-only");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const outDir = path.join(process.cwd(), "public", "samples");

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const config = extractorConfig();
  const local = config.ready && config.provider !== "mock";
  // No local key: use the deployed site's extractor if it is configured.
  const remote = !local && remoteConfigured();
  const live = !renderOnly && (local || remote);
  if (!renderOnly && !live) {
    console.log("No extractor available (no model key here, no SITE_URL + ADMIN_TOKEN): rendering images only. Existing .json files are left alone.");
  }

  let cost = 0;
  for (const def of SAMPLES) {
    if (only && def.id !== only) continue;
    const problems = validateDef(def);
    if (problems.length) throw new Error(problems.join("\n"));

    const files = await renderDoc(def);
    const preview = files[0].ext === "jpg" ? files[0].data : await renderPreview(def);
    fs.writeFileSync(path.join(outDir, `${def.id}.jpg`), preview);
    console.log(`rendered ${def.id} (${def.capture}, ${Math.round(preview.length / 1024)} KB)`);

    if (!live) continue;
    const inputs = files.map((file, i) => ({ data: new Uint8Array(file.data), mediaType: file.mediaType, name: `page-${i + 1}.${file.ext}` }));
    const result = remote
      ? await remoteExtract<ExtractionResult>(inputs, { docType: def.docType })
      : await extractDocument({ inputs, hint: def.docType });
    cost += result.usage.costUsd;
    const { usage, ...publicResult } = result;
    fs.writeFileSync(
      path.join(outDir, `${def.id}.json`),
      JSON.stringify(
        { generatedAt: new Date().toISOString(), model: usage.model, promptVersion: PROMPT_VERSION, result: { ...publicResult, ms: usage.ms } },
        null,
        1,
      ),
    );
    const failed = result.checks.filter((check) => !check.ok).length;
    console.log(
      `  converted: ${result.tables[0]?.rows.length ?? 0} rows, ${result.fields.length} fields, ${failed} failed checks, $${usage.costUsd.toFixed(4)}, ${usage.ms} ms`,
    );
  }
  if (live) console.log(`total model cost: $${cost.toFixed(4)}`);
  await closeBrowser();
}

main().catch(async (error) => {
  console.error(error);
  await closeBrowser();
  process.exit(1);
});
