/**
 * Extraction accuracy on eval/golden_docs.
 *
 *   npm run eval                          current configuration
 *   npm run eval -- --model claude-haiku-5-5 --effort low
 *   npm run eval -- --only inv-03-scan-noruling --verbose
 *   npm run eval -- --auto                do not tell the extractor the document type
 *   npm run eval -- --provider mock       exercises the harness without a model key
 *   npm run eval -- --remote              run against the deployed site's extractor
 *                                         (SITE_URL + ADMIN_TOKEN; the model key stays on the host)
 *
 * Run it before and after every change to the extractor and record both
 * numbers in results.tsv. A full run costs real money (the total is printed).
 *
 * Headline number: the mean document score, where a document's score is the
 * share of its expected header values and table cells that were read
 * correctly (extra rows count against it). See scripts/eval-lib.ts.
 */
import fs from "node:fs";
import path from "node:path";
import { ExtractorError, PROMPT_VERSION, extractDocument, extractorConfig, type ExtractOptions, type ExtractionResult } from "@/core/extractor";
import { checkEvalSeal, loadGolden, mediaTypeOf, scoreDoc, type DocScore, type GoldenDoc } from "./eval-lib";
import { remoteConfigured, remoteExtract } from "./remote";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);

const overrides: Partial<ExtractOptions> = {
  ...(option("model") ? { model: option("model") } : {}),
  ...(option("effort") ? { effort: option("effort") as ExtractOptions["effort"] } : {}),
  ...(option("provider") ? { provider: option("provider") } : {}),
};
// With no local model key but a configured site, measure the deployed extractor.
const remote = flag("remote") || (!flag("local") && !option("provider") && !extractorConfig().ready && remoteConfigured());
const only = option("only");
const concurrency = Number(option("concurrency") ?? 3);
const label = option("label") ?? "";

interface Row extends DocScore {
  ms: number;
  costUsd: number;
  error?: string;
}

async function runOne(doc: GoldenDoc): Promise<Row> {
  const inputs = doc.files.map((file) => ({
    data: new Uint8Array(fs.readFileSync(path.join(doc.dir, file))),
    mediaType: mediaTypeOf(file),
    name: file,
  }));
  const started = Date.now();
  const hint = flag("auto") ? "auto" : doc.docType;
  try {
    const result = remote
      ? await remoteExtract<ExtractionResult>(inputs, { docType: hint, model: overrides.model, effort: overrides.effort })
      : await extractDocument({ inputs, hint, ...overrides });
    return { ...scoreDoc(doc, result), ms: result.usage.ms, costUsd: result.usage.costUsd };
  } catch (error) {
    const message = error instanceof ExtractorError ? `${error.code}: ${error.message}` : error instanceof Error ? error.message : String(error);
    const empty = scoreDoc(doc, {
      docType: "other",
      docTypeLabel: "",
      fields: [],
      tables: [],
      checks: [],
      notes: [],
      pages: 0,
      truncated: false,
      usage: { provider: "", model: "", inputTokens: 0, outputTokens: 0, costUsd: 0, ms: 0 },
    });
    return { ...empty, mismatches: [{ where: "extraction", expected: "a result", actual: message }], ms: Date.now() - started, costUsd: 0, error: message };
  }
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

async function main() {
  const seal = checkEvalSeal();
  if (!seal.ok) {
    console.error("eval/ does not match its seal, so this score would not be comparable:");
    for (const problem of seal.problems) console.error("  " + problem);
    if (!flag("ignore-seal")) process.exit(2);
  }

  const config = extractorConfig(overrides);
  if (remote && !remoteConfigured()) {
    console.error("--remote needs SITE_URL and ADMIN_TOKEN.");
    process.exit(2);
  }
  if (!remote && !config.ready) {
    console.error(
      "The extractor has no credentials here. Set ANTHROPIC_API_KEY, or set SITE_URL and ADMIN_TOKEN to measure the deployed site, or use --provider mock to test the harness.",
    );
    process.exit(2);
  }

  const docs = loadGolden().filter((doc) => !only || doc.id === only);
  if (!docs.length) {
    console.error("No golden documents found.");
    process.exit(2);
  }
  const where = remote ? `remote ${process.env.SITE_URL}${overrides.model ? "" : " (the site's configured model)"}` : `provider ${config.provider}`;
  console.log(`model ${remote && !overrides.model ? "site default" : config.model}  effort ${remote && !overrides.effort ? "site default" : config.effort}  ${where}  prompt ${PROMPT_VERSION}  docs ${docs.length}\n`);

  const rows: Row[] = new Array(docs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, docs.length) }, async () => {
      while (next < docs.length) {
        const i = next++;
        rows[i] = await runOne(docs[i]);
        const row = rows[i];
        console.log(
          `${row.id.padEnd(26)} ${pct(row.score).padStart(6)}  fields ${row.fieldsCorrect}/${row.fieldsTotal}  cells ${row.cellsCorrect}/${row.cellsTotal}  rows ${row.rowsActual}/${row.rowsExpected}  ${(row.ms / 1000).toFixed(1)}s  $${row.costUsd.toFixed(4)}${row.error ? "  ERROR " + row.error : ""}`,
        );
        if (flag("verbose")) for (const miss of row.mismatches) console.log(`      ${miss.where}: expected "${miss.expected}" got "${miss.actual}"`);
      }
    }),
  );

  const sum = (pick: (row: Row) => number) => rows.reduce((n, row) => n + pick(row), 0);
  const summary = {
    at: new Date().toISOString(),
    label,
    model: config.model,
    effort: config.effort,
    provider: config.provider,
    promptVersion: PROMPT_VERSION,
    hint: flag("auto") ? "auto" : "doc-type",
    docs: rows.length,
    accuracy: sum((r) => r.score) / rows.length,
    fieldAccuracy: sum((r) => r.fieldsCorrect) / sum((r) => r.fieldsTotal),
    cellAccuracy: sum((r) => r.cellsCorrect) / Math.max(1, sum((r) => r.cellsTotal)),
    perfectDocs: rows.filter((r) => r.score === 1).length,
    errors: rows.filter((r) => r.error).length,
    costUsd: sum((r) => r.costUsd),
    meanSeconds: sum((r) => r.ms) / rows.length / 1000,
    byDifficulty: Object.fromEntries(
      ["easy", "medium", "hard"].map((level) => {
        const group = rows.filter((r) => r.difficulty === level);
        return [level, group.length ? group.reduce((n, r) => n + r.score, 0) / group.length : null];
      }),
    ),
  };

  console.log(
    `\naccuracy ${pct(summary.accuracy)}   fields ${pct(summary.fieldAccuracy)}   cells ${pct(summary.cellAccuracy)}   perfect ${summary.perfectDocs}/${summary.docs}   errors ${summary.errors}`,
  );
  console.log(
    `by difficulty: ${Object.entries(summary.byDifficulty)
      .map(([level, value]) => `${level} ${value === null ? "-" : pct(value)}`)
      .join("  ")}`,
  );
  console.log(`cost $${summary.costUsd.toFixed(4)}   mean ${summary.meanSeconds.toFixed(1)}s per document`);

  if (!only) {
    const outDir = path.join(process.cwd(), "eval-runs");
    fs.mkdirSync(outDir, { recursive: true });
    const file = path.join(outDir, `${summary.at.replace(/[:.]/g, "-")}_${config.model}_${config.effort}.json`);
    fs.writeFileSync(file, JSON.stringify({ summary, rows }, null, 1));
    console.log(`details: ${path.relative(process.cwd(), file)}`);
    // Columns: date, id, kind, change, metric, before, after, cost_usd, decision, notes
    const notes = `model=${config.model} effort=${config.effort} prompt=${PROMPT_VERSION} fields=${summary.fieldAccuracy.toFixed(4)} cells=${summary.cellAccuracy.toFixed(4)} perfect=${summary.perfectDocs}/${summary.docs} mean_s=${summary.meanSeconds.toFixed(1)}`;
    console.log(
      `\nresults.tsv row (fill in id, before and decision):\n${[summary.at.slice(0, 10), "", "eval", label || "-", "eval_accuracy", "", summary.accuracy.toFixed(4), summary.costUsd.toFixed(4), "", notes].join("\t")}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
