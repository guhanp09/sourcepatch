import { z } from "zod";

export const MAX_FILE_BYTES = 2_000_000;
export const MAX_TEXT = 40_000;
const id = z.string().min(1).max(100);
const date = z.string().datetime();
export const versionSchema = z
  .object({
    id,
    body: z.string().min(1).max(MAX_TEXT),
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    createdAt: date,
  })
  .strict();
export const sourceSchema = z
  .object({
    id,
    title: z.string().trim().min(1).max(160),
    archived: z.boolean(),
    versions: z.array(versionSchema).min(1).max(30),
  })
  .strict();
export const evidenceSchema = z
  .object({
    sourceId: id,
    versionId: id,
    quote: z.string().min(1).max(8000),
    confirmed: z.boolean(),
  })
  .strict();
export const passageSchema = z
  .object({
    id,
    text: z.string().trim().min(1).max(8000),
    evidence: z.array(evidenceSchema).max(10),
  })
  .strict();
export const outputSchema = z
  .object({
    id,
    title: z.string().trim().min(1).max(160),
    origin: z.enum(["NotebookLM export", "Other notes", "Sample"]),
    createdAt: date,
    passages: z.array(passageSchema).min(1).max(100),
  })
  .strict();
export const auditSchema = z
  .object({
    id,
    at: date,
    action: z.enum([
      "source-added",
      "source-revised",
      "source-archived",
      "source-restored",
      "output-added",
      "evidence-linked",
      "passage-reviewed",
    ]),
    subject: z.string().max(200),
    detail: z.string().max(3000),
    passageId: id.optional(),
    before: z.string().max(8000).optional(),
    after: z.string().max(8000).optional(),
    evidence: z.array(evidenceSchema).max(10).optional(),
  })
  .strict();
export const workspaceSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    name: z.string().trim().min(1).max(160),
    sample: z.boolean(),
    sources: z.array(sourceSchema).max(20),
    outputs: z.array(outputSchema).max(20),
    audit: z.array(auditSchema).max(2000),
  })
  .strict();

export type SourceVersion = z.infer<typeof versionSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type Passage = z.infer<typeof passageSchema>;
export type Output = z.infer<typeof outputSchema>;
export type Audit = z.infer<typeof auditSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type ReviewState =
  "changed" | "context" | "unlinked" | "missing" | "current";

export const stateLabels: Record<ReviewState, string> = {
  changed: "Evidence changed",
  context: "Context changed",
  unlinked: "Link evidence",
  missing: "Source unavailable",
  current: "No source change",
};

export const normalize = (text: string) =>
  text.replace(/\r\n?/g, "\n").normalize("NFC").trim();
export const latest = (source: Source) =>
  source.versions[source.versions.length - 1];
export const uid = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

export async function digest(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalize(text));
  const buffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buffer), (value) =>
    value.toString(16).padStart(2, "0"),
  ).join("");
}

export async function makeVersion(body: string): Promise<SourceVersion> {
  const text = normalize(body);
  if (!text || text.length > MAX_TEXT)
    throw new Error(
      `Source text must contain 1–${MAX_TEXT.toLocaleString()} characters.`,
    );
  return {
    id: uid(),
    body: text,
    digest: await digest(text),
    createdAt: now(),
  };
}

export function emptyWorkspace(): Workspace {
  return {
    schemaVersion: 1,
    id: uid(),
    name: "My notebook workspace",
    sample: false,
    sources: [],
    outputs: [],
    audit: [],
  };
}

/** Validate structure, references, evidence anchors and content hashes before replacing local state. */
export async function parseWorkspace(raw: string): Promise<Workspace> {
  if (new TextEncoder().encode(raw).length > MAX_FILE_BYTES)
    throw new Error("This workspace exceeds the 2 MB import limit.");
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(
      "This is not a valid JSON workspace. Your current workspace is unchanged.",
    );
  }
  const result = workspaceSchema.safeParse(json);
  if (!result.success)
    throw new Error(
      "This file does not match the SourcePatch workspace format.",
    );
  const workspace = result.data;
  const allIds = new Set<string>();
  const register = (value: string) => {
    if (allIds.has(value))
      throw new Error("Workspace contains duplicate identifiers.");
    allIds.add(value);
  };
  register(workspace.id);
  for (const source of workspace.sources) {
    register(source.id);
    for (const version of source.versions) {
      register(version.id);
      if ((await digest(version.body)) !== version.digest)
        throw new Error(
          "A source snapshot has an invalid content fingerprint.",
        );
    }
  }
  for (const output of workspace.outputs) {
    register(output.id);
    for (const passage of output.passages) {
      register(passage.id);
      for (const evidence of passage.evidence) {
        const source = workspace.sources.find(
          (s) => s.id === evidence.sourceId,
        );
        const version = source?.versions.find(
          (v) => v.id === evidence.versionId,
        );
        if (
          !version ||
          !normalize(version.body).includes(normalize(evidence.quote))
        ) {
          throw new Error(
            "A passage references missing evidence. Import an intact workspace backup.",
          );
        }
      }
    }
  }
  for (const entry of workspace.audit) register(entry.id);
  return workspace;
}
