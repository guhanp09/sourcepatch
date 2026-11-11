import { writeFile, mkdir } from "node:fs/promises";
import { scenarios, fixture } from "./fixtures";
import { inspectPassage } from "../src/core/engine";
import { normalize } from "../src/core/model";

const rows = await Promise.all(
  scenarios.map(async (item) => {
    const data = await fixture(item);
    const actual = inspectPassage(data.passage, data.sources).state;
    const sourceChanged = normalize(item.before) !== normalize(item.after);
    const brokenLink =
      !item.quote ||
      item.confirmed === false ||
      item.missing === true ||
      item.archived === true;
    return {
      id: item.id,
      category: item.category,
      expected: item.expected,
      actual,
      reason: item.reason,
      predictions: {
        "Leave output unchanged": false,
        "Invalidate all on any source change": Boolean(
          sourceChanged || item.unrelatedChange || brokenLink,
        ),
        "Check cited excerpt only": Boolean(
          brokenLink ||
          (item.quote &&
            !normalize(item.after).includes(normalize(item.quote))),
        ),
        SourcePatch: actual !== "current",
      },
    };
  }),
);
const methods = Object.keys(
  rows[0].predictions,
) as (keyof (typeof rows)[number]["predictions"])[];
const results = methods.map((method) => {
  let tp = 0,
    fp = 0,
    fn = 0,
    tn = 0;
  for (const row of rows) {
    const expected = row.expected !== "current";
    const predicted = row.predictions[method];
    if (predicted && expected) tp++;
    else if (predicted) fp++;
    else if (expected) fn++;
    else tn++;
  }
  return {
    method,
    truePositive: tp,
    falsePositive: fp,
    falseNegative: fn,
    trueNegative: tn,
    precision: tp + fp ? tp / (tp + fp) : null,
    recall: tp / (tp + fn),
    alerts: tp + fp,
  };
});
const statusCorrect = rows.filter((row) => row.actual === row.expected).length;
const report = {
  dataset: "SourcePatch authored regression scenarios v1",
  sampleSize: rows.length,
  statusCorrect,
  statusTotal: rows.length,
  results,
  cases: rows,
};
await mkdir("evaluation", { recursive: true });
await writeFile(
  "evaluation/results.json",
  `${JSON.stringify(report, null, 2)}\n`,
);
const percent = (n: number | null) =>
  n === null ? "n/a" : `${(n * 100).toFixed(1)}%`;
const md = [
  "# Evaluation results",
  "",
  "**Scope:** 26 hand-authored source-revision scenarios. This is a deterministic regression and policy comparison, not a production benchmark, held-out model evaluation, or user study. The fixture policy and implementation were developed together; perfect agreement cannot establish real-world accuracy.",
  "",
  "Run `npm run evaluate` to reproduce this table. No network, API key, personal documents or paid services are used.",
  "",
  "A positive label means a passage requires review. Context changes deliberately count as positive because a surviving quote can be qualified elsewhere. The same explicit unresolved-evidence policy is applied to the comparison strategies that inspect evidence.",
  "",
  "| Strategy | Review needs found | Review needs missed | Unnecessary alerts | Precision | Recall | Total alerts |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
  ...results.map(
    (r) =>
      `| ${r.method} | ${r.truePositive} | ${r.falseNegative} | ${r.falsePositive} | ${percent(r.precision)} | ${percent(r.recall)} | ${r.alerts} |`,
  ),
  "",
  `Full status agreement: **${statusCorrect}/${rows.length}** across changed evidence, changed context, unlinked evidence, missing source and unchanged source cases.`,
  "",
  "## Interpretation",
  "",
  "- Exact-anchor checking misses changed surrounding context in these fixtures. This motivates a separate context-review category.",
  "- Blanket invalidation surfaces unrelated changes too. SourcePatch uses explicit dependencies to avoid those alerts.",
  "- SourcePatch still flags harmless edits elsewhere in a linked source. It does not claim semantic understanding or automatic fact verification.",
  "- Similarity-based citation suggestions are never treated as verified, regardless of their score.",
  "- This test set cannot measure review time, setup burden, adoption, comprehension, retention or translation quality.",
  "- Optional Gemini suggestions are evaluated separately with mocked transport/validation tests. These figures are not Gemini quality measurements.",
  "",
  "## Scenario-level results",
  "",
  "| Case | Expected | Observed | Reason |",
  "| --- | --- | --- | --- |",
  ...rows.map(
    (row) => `| ${row.id} | ${row.expected} | ${row.actual} | ${row.reason} |`,
  ),
  "",
  "## Next validation",
  "",
  "Freeze a separate set of real, permissioned document revisions before further tuning. Recruit independent reviewers to label meaning changes and relevant context. Run a counterbalanced comparison with manual checking, counting initial link setup and corrections as part of total effort. Report uncertainty and failures, including cases where extra alerts outweigh any benefit. See [the proposed study](../docs/RESEARCH_PLAN.md).",
  "",
].join("\n");
await writeFile("evaluation/RESULTS.md", md);
console.log(
  JSON.stringify(
    {
      scenarios: rows.length,
      fullStatusAgreement: `${statusCorrect}/${rows.length}`,
      results,
    },
    null,
    2,
  ),
);
if (statusCorrect !== rows.length) process.exitCode = 1;
