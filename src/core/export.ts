import { inspectPassage } from "./engine";
import { latest, stateLabels, type Workspace, type Output } from "./model";

const line = (s: string) => s.replace(/[\r\n]/g, " ");
export function exportOutput(output: Output, workspace: Workspace): string {
  const pending = output.passages.filter(
    (p) => inspectPassage(p, workspace.sources).needsReview,
  ).length;
  return [
    `# ${line(output.title)}`,
    "",
    "> Exported from SourcePatch. Freshness review does not certify factual accuracy.",
    `> ${pending} of ${output.passages.length} passages still need review.`,
    "",
    ...output.passages.flatMap((passage, i) => {
      const state = inspectPassage(passage, workspace.sources).state;
      const refs = passage.evidence.map((e) => {
        const source = workspace.sources.find((s) => s.id === e.sourceId);
        const version = source?.versions.find((v) => v.id === e.versionId);
        return `- ${line(source?.title ?? "Unavailable source")} · snapshot ${version?.digest.slice(0, 12) ?? "unknown"}${e.confirmed ? "" : " · unconfirmed link"}\n  > ${e.quote.replace(/\n/g, "\n  > ")}`;
      });
      return [
        `## Passage ${i + 1}`,
        "",
        passage.text,
        "",
        `Review status: **${stateLabels[state]}**`,
        ...refs,
        "",
      ];
    }),
    "---",
    "Source snapshots in this workspace:",
    ...workspace.sources.map(
      (s) =>
        `- ${line(s.title)}: ${latest(s).digest}${s.archived ? " (archived)" : ""}`,
    ),
    "",
  ].join("\n");
}

export function downloadFile(name: string, body: string, mime = "text/plain") {
  const url = URL.createObjectURL(
    new Blob([body], { type: `${mime};charset=utf-8` }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function safeFilename(title: string) {
  return title.replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 80) || "note";
}
