import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { parseWorkspace, latest } from "../src/core/model";
import { requestGemini } from "../src/core/gemini";

async function main() {
  const args = process.argv.slice(2);
  if (
    !args[0] ||
    !args[1] ||
    args[0].startsWith("--") ||
    args[1].startsWith("--")
  )
    throw new Error(
      "Usage: npm run review:gemini -- <workspace.json> <private/review.md> [--limit 1..10]",
    );
  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : 8;
  const inputPath = resolve(args[0]);
  const outputPath = resolve(args[1]);
  if (inputPath === outputPath)
    throw new Error(
      "Choose a different output path; the workspace backup will not be overwritten.",
    );
  if (existsSync(outputPath))
    throw new Error(
      "The output file already exists. Choose a new path; no API request was made.",
    );
  if (existsSync(".env")) process.loadEnvFile(".env");
  const workspace = await parseWorkspace(await readFile(inputPath, "utf8"));
  const model = process.env.GEMINI_MODEL ?? "";
  const result = await requestGemini(workspace, {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    model,
    limit,
  });
  const lines = [
    "# Gemini review suggestions",
    "",
    `Model: ${model}`,
    "",
    "**Unapproved suggestions.** Review every claim and exact source excerpt in SourcePatch before making changes. This file contains source material; keep it private.",
    "",
  ];
  for (const item of result.suggestions) {
    const passage = workspace.outputs
      .flatMap((o) => o.passages)
      .find((p) => p.id === item.passageId)!;
    lines.push(
      `## ${item.passageId} — ${item.decision}`,
      "",
      "### Existing wording",
      "",
      passage.text,
      "",
      "### Proposed wording",
      "",
      item.proposedText || "(No supported revision available.)",
      "",
      "### Reasoning",
      "",
      item.explanation,
      "",
      "### Current evidence",
      "",
    );
    for (const e of item.evidence) {
      const source = workspace.sources.find((s) => s.id === e.sourceId)!;
      lines.push(
        `- ${source.title} · SHA-256 ${latest(source).digest}`,
        "",
        `> ${e.quote.replace(/\n/g, "\n> ")}`,
        "",
      );
    }
  }
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, lines.join("\n"), { flag: "wx" });
  console.log(
    `Saved ${result.suggestions.length} unapproved suggestions to ${outputPath}. The workspace was not modified.`,
  );
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Review failed.");
  process.exitCode = 1;
});
