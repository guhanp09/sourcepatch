import {
  latest,
  normalize,
  type Evidence,
  type Passage,
  type Source,
  type ReviewState,
  type Workspace,
} from "./model";

export type EvidenceResult = {
  evidence: Evidence;
  state: ReviewState;
  reason: string;
  source?: Source;
  previousText?: string;
  currentText?: string;
  suggestedQuote?: string;
};

// Priority describes review order, never a probability that a statement is false.
export const priorities: Record<ReviewState, number> = {
  missing: 0,
  changed: 1,
  unlinked: 2,
  context: 3,
  current: 4,
};

export function paragraphs(text: string): string[] {
  return normalize(text)
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Keep long source paragraphs usable without changing the original source text. */
export function sourceExcerpts(text: string): string[] {
  return paragraphs(text).flatMap((paragraph) => {
    const result: string[] = [];
    let remaining = paragraph;
    while (remaining.length > 6000) {
      const boundary = Math.max(
        remaining.lastIndexOf("\n", 6000),
        remaining.lastIndexOf(" ", 6000),
      );
      const cut = boundary > 3000 ? boundary : 6000;
      result.push(remaining.slice(0, cut).trim());
      remaining = remaining.slice(cut).trim();
    }
    if (remaining) result.push(remaining);
    return result;
  });
}

const stopwords = new Set(
  "a an the of to in is are was were be been and or for on at by as it this that with from not can will their they we you your our".split(
    " ",
  ),
);
function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(
    (t) => !stopwords.has(t),
  );
}

/** TF-IDF cosine similarity suggests evidence; it never verifies entailment. */
export function rankEvidence(
  text: string,
  candidates: { source: Source; quote: string }[],
) {
  const corpus = candidates.map((item) => tokens(item.quote));
  const query = tokens(text);
  const dfs = new Map<string, number>();
  for (const doc of corpus)
    for (const token of new Set(doc)) dfs.set(token, (dfs.get(token) ?? 0) + 1);
  const vector = (doc: string[]) => {
    const counts = new Map<string, number>();
    for (const token of doc) counts.set(token, (counts.get(token) ?? 0) + 1);
    const values = new Map<string, number>();
    for (const [token, count] of counts)
      values.set(
        token,
        (1 + Math.log(count)) *
          (1 + Math.log((corpus.length + 1) / ((dfs.get(token) ?? 0) + 1))),
      );
    return values;
  };
  const q = vector(query);
  const norm = (v: Map<string, number>) =>
    Math.sqrt([...v.values()].reduce((sum, n) => sum + n * n, 0));
  const qNorm = norm(q);
  return candidates
    .map((item, index) => {
      const v = vector(corpus[index]);
      const dot = [...q].reduce(
        (sum, [token, weight]) => sum + weight * (v.get(token) ?? 0),
        0,
      );
      return { ...item, score: qNorm && norm(v) ? dot / (qNorm * norm(v)) : 0 };
    })
    .sort((a, b) => b.score - a.score);
}

export function suggestEvidence(text: string, sources: Source[]): Evidence[] {
  const candidates = sources
    .filter((s) => !s.archived)
    .flatMap((source) =>
      sourceExcerpts(latest(source).body)
        .filter((quote) => quote.length <= 8000)
        .map((quote) => ({ source, quote })),
    );
  const best = rankEvidence(text, candidates)[0];
  return best && best.score >= 0.22
    ? [
        {
          sourceId: best.source.id,
          versionId: latest(best.source).id,
          quote: best.quote,
          confirmed: false,
        },
      ]
    : [];
}

export function inspectEvidence(
  evidence: Evidence,
  sources: Source[],
): EvidenceResult {
  const source = sources.find((s) => s.id === evidence.sourceId);
  if (!source || source.archived)
    return {
      evidence,
      source,
      state: "missing",
      reason:
        "This source is unavailable. Restore it or link replacement evidence.",
    };
  const previous = source.versions.find((v) => v.id === evidence.versionId);
  const current = latest(source);
  const common = {
    evidence,
    source,
    previousText: previous?.body,
    currentText: current.body,
  };
  if (
    !previous ||
    !normalize(previous.body).includes(normalize(evidence.quote))
  ) {
    return {
      ...common,
      state: "unlinked",
      reason: "The original evidence cannot be located. A new link is needed.",
    };
  }
  if (!evidence.confirmed)
    return {
      ...common,
      state: "unlinked",
      reason:
        "This evidence was suggested by text similarity. Confirm it before relying on this link.",
    };
  if (normalize(previous.body) === normalize(current.body)) {
    return {
      ...common,
      state: "current",
      reason:
        "The source matches the snapshot used for this passage. This is a freshness check, not a fact check.",
    };
  }
  if (normalize(current.body).includes(normalize(evidence.quote))) {
    return {
      ...common,
      state: "context",
      reason:
        "The linked excerpt is unchanged, but other source content changed. New context can change its interpretation.",
    };
  }
  const best = rankEvidence(
    evidence.quote,
    sourceExcerpts(current.body)
      .filter((quote) => quote.length <= 8000)
      .map((quote) => ({ source, quote })),
  )[0];
  return {
    ...common,
    state: "changed",
    reason:
      "The linked evidence changed or was removed. Compare the current source before keeping or editing this passage.",
    suggestedQuote: best && best.score >= 0.18 ? best.quote : undefined,
  };
}

export function inspectPassage(passage: Passage, sources: Source[]) {
  const evidence = passage.evidence.map((e) => inspectEvidence(e, sources));
  const state: ReviewState = evidence.length
    ? [...evidence].sort((a, b) => priorities[a.state] - priorities[b.state])[0]
        .state
    : "unlinked";
  return { state, evidence, needsReview: state !== "current" };
}

export function reviewQueue(workspace: Workspace) {
  return workspace.outputs
    .flatMap((output) =>
      output.passages.map((passage, index) => ({
        output,
        passage,
        index,
        ...inspectPassage(passage, workspace.sources),
      })),
    )
    .sort((a, b) => priorities[a.state] - priorities[b.state]);
}
