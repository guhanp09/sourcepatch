import { useEffect, useState } from "react";
import { diffWordsWithSpace } from "diff";
import {
  ArrowRight,
  Check,
  CheckCheck,
  Plus,
  Trash2,
  PencilLine,
  ExternalLink,
} from "lucide-react";
import { latest, type Evidence, type Workspace } from "../core/model";
import { inspectPassage, sourceExcerpts } from "../core/engine";
import { saveReview } from "../core/actions";
import { Status } from "./Status";

export function WordDiff({ before, after }: { before: string; after: string }) {
  return (
    <div className="word-diff" aria-label="Source changes">
      {diffWordsWithSpace(before, after).map((part, i) =>
        part.added ? (
          <ins key={i}>{part.value}</ins>
        ) : part.removed ? (
          <del key={i}>{part.value}</del>
        ) : (
          <span key={i}>{part.value}</span>
        ),
      )}
    </div>
  );
}

export function ReviewDetail({
  workspace,
  passageId,
  commit,
  onViewSource,
}: {
  workspace: Workspace;
  passageId: string;
  commit: (next: Workspace) => void;
  onViewSource: (id: string) => void;
}) {
  const output = workspace.outputs.find((o) =>
    o.passages.some((p) => p.id === passageId),
  );
  const passage = output?.passages.find((p) => p.id === passageId);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [checked, setChecked] = useState(false);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [error, setError] = useState("");
  const revisionKey = workspace.sources
    .map((s) => `${s.id}:${latest(s).id}:${s.archived}`)
    .join("|");

  useEffect(() => {
    if (!passage) return;
    setText(passage.text);
    setNote("");
    setChecked(false);
    setError("");
    const inspection = inspectPassage(passage, workspace.sources);
    setEvidence(
      inspection.evidence
        .filter((r) => r.source && !r.source.archived)
        .map((r) => {
          const current = latest(r.source!);
          const available = current.body.includes(r.evidence.quote)
            ? r.evidence.quote
            : (r.suggestedQuote ?? "");
          return {
            sourceId: r.source!.id,
            versionId: current.id,
            quote: available,
            confirmed: true,
          };
        }),
    );
  }, [passageId, revisionKey, passage?.text, passage?.evidence]);

  if (!passage || !output)
    return (
      <div className="empty-state">
        <CheckCheck size={32} />
        <h2>Choose a passage to review</h2>
        <p>Select an item in the review queue to compare its evidence.</p>
      </div>
    );
  const inspection = inspectPassage(passage, workspace.sources);
  const availableSources = workspace.sources.filter((s) => !s.archived);
  const isKeeping = text.trim() === passage.text.trim();
  const patchEvidence = (index: number, next: Evidence) => {
    setEvidence((items) => items.map((item, i) => (i === index ? next : item)));
    setChecked(false);
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!checked) {
      setError(
        "Confirm that you checked the wording against the current evidence.",
      );
      return;
    }
    try {
      commit(saveReview(workspace, passage.id, text, evidence, note));
    } catch (error) {
      setError((error as Error).message);
    }
  };
  return (
    <section className="review-detail" aria-label="Passage review">
      <div className="detail-header">
        <div>
          <span className="eyebrow">
            PASSAGE {output.passages.indexOf(passage) + 1} · {output.title}
          </span>
          <h2>Follow the evidence.</h2>
        </div>
        <Status state={inspection.state} />
      </div>
      <div className="original-passage">
        <span className="field-eyebrow">CURRENT NOTE</span>
        <p>{passage.text}</p>
      </div>
      <div className="evidence-stack">
        {inspection.evidence.length === 0 && (
          <div className="context-callout">
            <strong>No evidence linked yet.</strong>
            <p>
              A source link is needed to track future changes. Choose an excerpt
              below and verify that it supports this passage.
            </p>
          </div>
        )}
        {inspection.evidence.map((result, i) => (
          <div
            className="evidence-card"
            key={`${result.evidence.sourceId}-${i}`}
          >
            <div className="evidence-heading">
              <span>{result.source?.title ?? "Unavailable source"}</span>
              {result.source && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onViewSource(result.source!.id)}
                >
                  Full source <ExternalLink size={12} />
                </button>
              )}
            </div>
            <p className="evidence-reason">{result.reason}</p>
            {result.state === "changed" ? (
              <>
                <div className="diff-legend">
                  <span>
                    <i className="legend-removed" />
                    Previous
                  </span>
                  <ArrowRight size={13} />
                  <span>
                    <i className="legend-added" />
                    Current candidate
                  </span>
                </div>
                <WordDiff
                  before={result.evidence.quote}
                  after={
                    result.suggestedQuote ??
                    "[No matching excerpt found. Select replacement evidence below.]"
                  }
                />
                <p className="microcopy">
                  Candidate matched by text similarity. Check the full source
                  before accepting it.
                </p>
              </>
            ) : (
              <blockquote>{result.evidence.quote}</blockquote>
            )}
            {result.state === "context" &&
              result.previousText &&
              result.currentText && (
                <details className="context-diff">
                  <summary>See changes elsewhere in this source</summary>
                  <WordDiff
                    before={result.previousText}
                    after={result.currentText}
                  />
                </details>
              )}
          </div>
        ))}
      </div>
      <form onSubmit={save} className="review-form">
        <div className="section-label">
          <PencilLine size={16} />
          <h3>Your review</h3>
          <span>Human approval required</span>
        </div>
        <label className="field-label" htmlFor="reviewed-text">
          Reviewed wording
        </label>
        <textarea
          id="reviewed-text"
          value={text}
          maxLength={8000}
          rows={4}
          onChange={(e) => {
            setText(e.target.value);
            setChecked(false);
          }}
        />
        <div className="field-row">
          <label className="field-label">Evidence in the latest sources</label>
          <button
            type="button"
            className="text-button"
            disabled={!availableSources.length || evidence.length >= 10}
            onClick={() => {
              const source = availableSources[0];
              if (source)
                setEvidence([
                  ...evidence,
                  {
                    sourceId: source.id,
                    versionId: latest(source).id,
                    quote: "",
                    confirmed: true,
                  },
                ]);
              setChecked(false);
            }}
          >
            <Plus size={14} />
            Add evidence
          </button>
        </div>
        {evidence.map((entry, i) => {
          const source = availableSources.find((s) => s.id === entry.sourceId);
          const options = source
            ? sourceExcerpts(latest(source).body).filter(
                (p) => p.length <= 8000,
              )
            : [];
          if (entry.quote && !options.includes(entry.quote))
            options.unshift(entry.quote);
          return (
            <div className="link-editor" key={i}>
              <div className="link-editor-top">
                <select
                  aria-label={`Evidence source ${i + 1}`}
                  value={entry.sourceId}
                  onChange={(e) => {
                    const selected = availableSources.find(
                      (s) => s.id === e.target.value,
                    )!;
                    patchEvidence(i, {
                      sourceId: selected.id,
                      versionId: latest(selected).id,
                      quote: "",
                      confirmed: true,
                    });
                  }}
                >
                  {availableSources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} · v{s.versions.length}
                    </option>
                  ))}
                </select>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={`Remove evidence ${i + 1}`}
                  onClick={() => {
                    setEvidence(evidence.filter((_, index) => index !== i));
                    setChecked(false);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <select
                required
                aria-label={`Evidence excerpt ${i + 1}`}
                value={entry.quote}
                onChange={(e) =>
                  patchEvidence(i, { ...entry, quote: e.target.value })
                }
              >
                <option value="">Choose a supporting excerpt…</option>
                {options.map((p, index) => (
                  <option value={p} key={index}>
                    {p.length > 125 ? `${p.slice(0, 125)}…` : p}
                  </option>
                ))}
              </select>
              {entry.quote && (
                <p className="selected-evidence">{entry.quote}</p>
              )}
            </div>
          );
        })}
        {!evidence.length && (
          <p className="microcopy">
            Add a source excerpt to make the passage traceable.
          </p>
        )}
        <label className="field-label" htmlFor="review-note">
          Review note{" "}
          <span>
            {isKeeping ? "(required when keeping the wording)" : "(optional)"}
          </span>
        </label>
        <input
          id="review-note"
          value={note}
          maxLength={3000}
          required={isKeeping}
          placeholder="What changed, or why the wording still holds"
          onChange={(e) => setNote(e.target.value)}
        />
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span>
            I checked the wording against the selected current evidence.
          </span>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="review-footer">
          <span>Saved with source versions and a review record.</span>
          <button
            className="button button-primary"
            type="submit"
            disabled={!checked || !evidence.length}
          >
            <Check size={16} />
            Save reviewed passage
          </button>
        </div>
      </form>
    </section>
  );
}
