/**
 * Fails if anything under eval/ has changed since it was sealed.
 *
 *   npm run eval:guard              check (part of `npm run check`)
 *   npm run eval:guard -- --reseal  HUMAN ONLY: accept the current contents of eval/ as the new golden set
 *
 * program.md: "You may not edit anything in eval/." The agent runs the check
 * every night and never runs --reseal.
 */
import { checkEvalSeal, sealEval } from "./eval-lib";

if (process.argv.includes("--reseal")) {
  if (process.env.CLAUDECODE || process.env.CI_AGENT) {
    console.error("Refusing to reseal from an agent session. Resealing eval/ is for the human who owns the golden set.");
    process.exit(1);
  }
  console.log(`resealed ${sealEval()} files`);
  process.exit(0);
}

const report = checkEvalSeal();
if (report.ok) {
  console.log(`eval/ is intact (${report.files} sealed files)`);
} else {
  console.error("eval/ has changed since it was sealed:");
  for (const problem of report.problems) console.error("  " + problem);
  console.error("\nRevert the change. Only the human may alter the golden set (npm run eval:guard -- --reseal).");
  process.exit(1);
}
