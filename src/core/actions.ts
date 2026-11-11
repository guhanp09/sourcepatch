import {
  latest,
  makeVersion,
  now,
  normalize,
  uid,
  workspaceSchema,
  type Evidence,
  type Audit,
  type Workspace,
  type Output,
} from "./model";
import { paragraphs, suggestEvidence } from "./engine";

function record(
  workspace: Workspace,
  entry: Omit<Audit, "id" | "at">,
): Workspace {
  const next = {
    ...workspace,
    audit: [{ ...entry, id: uid(), at: now() }, ...workspace.audit],
  };
  const result = workspaceSchema.safeParse(next);
  if (!result.success)
    throw new Error(
      "Workspace limit reached. Export a backup and start a new workspace. No changes were saved.",
    );
  if (new TextEncoder().encode(JSON.stringify(next)).length > 1_800_000)
    throw new Error(
      "Workspace is near its 2 MB limit. Export a backup before starting another workspace.",
    );
  return next;
}

export async function addSource(
  workspace: Workspace,
  title: string,
  body: string,
): Promise<Workspace> {
  if (!title.trim()) throw new Error("Give this source a title.");
  const source = {
    id: uid(),
    title: title.trim(),
    archived: false,
    versions: [await makeVersion(body)],
  };
  return record(
    { ...workspace, sources: [...workspace.sources, source] },
    {
      action: "source-added",
      subject: source.title,
      detail: "Original source snapshot saved.",
    },
  );
}

export async function reviseSource(
  workspace: Workspace,
  sourceId: string,
  body: string,
): Promise<Workspace> {
  const source = workspace.sources.find((s) => s.id === sourceId);
  if (!source) throw new Error("This source no longer exists.");
  const version = await makeVersion(body);
  if (normalize(latest(source).body) === normalize(version.body))
    throw new Error(
      "This matches the current source. There is no new revision to save.",
    );
  return record(
    {
      ...workspace,
      sources: workspace.sources.map((s) =>
        s.id === sourceId ? { ...s, versions: [...s.versions, version] } : s,
      ),
    },
    {
      action: "source-revised",
      subject: source.title,
      detail: `Revision ${source.versions.length + 1} saved. Linked passages are evaluated against this snapshot.`,
    },
  );
}

export function archiveSource(
  workspace: Workspace,
  sourceId: string,
): Workspace {
  const source = workspace.sources.find((s) => s.id === sourceId);
  if (!source) throw new Error("Source not found.");
  return record(
    {
      ...workspace,
      sources: workspace.sources.map((s) =>
        s.id === sourceId ? { ...s, archived: !s.archived } : s,
      ),
    },
    {
      action: source.archived ? "source-restored" : "source-archived",
      subject: source.title,
      detail: source.archived
        ? "Source restored for freshness checks."
        : "Source archived; snapshots retained. Linked passages require replacement evidence or restoration.",
    },
  );
}

export function addOutput(
  workspace: Workspace,
  title: string,
  body: string,
  sourceIds: string[],
  origin: Output["origin"],
): Workspace {
  if (!title.trim() || !body.trim())
    throw new Error("Add a title and the exported note text.");
  const chunks = paragraphs(body);
  if (chunks.length > 100 || chunks.some((p) => p.length > 8000))
    throw new Error(
      "Use up to 100 passages of 8,000 characters each. Separate passages with blank lines.",
    );
  const sources = workspace.sources.filter(
    (s) => sourceIds.includes(s.id) && !s.archived,
  );
  const output: Output = {
    id: uid(),
    title: title.trim(),
    origin,
    createdAt: now(),
    passages: chunks.map((text) => ({
      id: uid(),
      text,
      evidence: suggestEvidence(text, sources),
    })),
  };
  return record(
    { ...workspace, outputs: [...workspace.outputs, output] },
    {
      action: "output-added",
      subject: output.title,
      detail: `${chunks.length} passages imported. Suggested evidence requires human confirmation.`,
    },
  );
}

export function saveReview(
  workspace: Workspace,
  passageId: string,
  text: string,
  evidence: Evidence[],
  note: string,
): Workspace {
  const output = workspace.outputs.find((o) =>
    o.passages.some((p) => p.id === passageId),
  );
  const previous = output?.passages.find((p) => p.id === passageId);
  if (!previous || !output) throw new Error("Passage not found.");
  if (!text.trim() || text.length > 8000)
    throw new Error("Use 1–8,000 characters for the reviewed passage.");
  if (!evidence.length)
    throw new Error(
      "Link at least one current source excerpt before recording a review.",
    );
  if (text.trim() === previous.text.trim() && !note.trim())
    throw new Error("Add a short reason for keeping the existing wording.");
  for (const e of evidence) {
    const source = workspace.sources.find((s) => s.id === e.sourceId);
    if (
      !source ||
      source.archived ||
      latest(source).id !== e.versionId ||
      !normalize(latest(source).body).includes(normalize(e.quote)) ||
      !e.confirmed
    ) {
      throw new Error(
        "Evidence must be confirmed against the latest available source. Reopen this passage to refresh its evidence.",
      );
    }
  }
  const next = {
    ...workspace,
    outputs: workspace.outputs.map((o) => ({
      ...o,
      passages: o.passages.map((p) =>
        p.id === passageId ? { ...p, text: text.trim(), evidence } : p,
      ),
    })),
  };
  return record(next, {
    action: "passage-reviewed",
    subject: output.title,
    passageId,
    detail:
      note.trim() || "Wording updated after reviewing the current evidence.",
    before: previous.text,
    after: text.trim(),
    evidence,
  });
}
