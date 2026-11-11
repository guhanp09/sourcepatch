import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileText,
  Files,
  FolderOpen,
  Code2,
  History,
  Layers3,
  Leaf,
  Link2,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  addOutput,
  addSource,
  archiveSource,
  reviseSource,
} from "./core/actions";
import { createDemo } from "./core/demo";
import { inspectPassage, reviewQueue } from "./core/engine";
import { downloadFile, exportOutput, safeFilename } from "./core/export";
import {
  emptyWorkspace,
  latest,
  MAX_FILE_BYTES,
  MAX_TEXT,
  parseWorkspace,
  type Workspace,
  type Output,
  type Source,
} from "./core/model";
import { loadWorkspace, persistWorkspace, STORAGE_KEY } from "./core/storage";
import { Dialog } from "./components/Dialog";
import { ReviewDetail, WordDiff } from "./components/ReviewDetail";
import { Status } from "./components/Status";

type View = "review" | "sources" | "outputs" | "activity" | "brief";
type Modal =
  | { type: "source"; id?: string }
  | { type: "output" }
  | { type: "new" }
  | { type: "restore"; raw: string; name: string }
  | { type: "inspect"; id: string }
  | null;
const repo = "https://github.com/guhanp09/sourcepatch";

async function readFile(file: File, formats: string[]) {
  if (!formats.some((extension) => file.name.toLowerCase().endsWith(extension)))
    throw new Error(`Choose a ${formats.join(" or ")} file.`);
  if (file.size > MAX_FILE_BYTES)
    throw new Error("Choose a file smaller than 2 MB.");
  return file.text();
}
function dateLabel(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function SourceInspector({ source }: { source: Source }) {
  const [index, setIndex] = useState(source.versions.length - 1);
  const [showDiff, setShowDiff] = useState(false);
  return (
    <div className="source-inspector">
      <p className="muted">
        Each snapshot is retained so a review stays traceable.
      </p>
      <label className="field-label" htmlFor="snapshot">
        Source snapshot
      </label>
      <select
        id="snapshot"
        value={index}
        onChange={(e) => setIndex(Number(e.target.value))}
      >
        {source.versions.map((v, i) => (
          <option value={i} key={v.id}>
            Version {i + 1}
            {i === source.versions.length - 1 ? " · current" : ""} ·{" "}
            {dateLabel(v.createdAt)}
          </option>
        ))}
      </select>
      <div className="snapshot-meta">
        <code>SHA-256 {source.versions[index].digest.slice(0, 16)}…</code>
        {index > 0 && (
          <button
            type="button"
            className="text-button"
            onClick={() => setShowDiff(!showDiff)}
          >
            {showDiff ? "Read source" : "Compare with previous"}
          </button>
        )}
      </div>
      {showDiff && index > 0 ? (
        <WordDiff
          before={source.versions[index - 1].body}
          after={source.versions[index].body}
        />
      ) : (
        <pre className="source-body">{source.versions[index].body}</pre>
      )}
    </div>
  );
}

export default function App() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [view, setView] = useState<View>("review");
  const [modal, setModal] = useState<Modal>(null);
  const [selected, setSelected] = useState("");
  const [filter, setFilter] = useState("needs-review");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  const [blockedStorage, setBlockedStorage] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [help, setHelp] = useState(false);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [origin, setOrigin] = useState<Output["origin"]>("NotebookLM export");
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      let loaded: Workspace | null = null;
      try {
        loaded = await loadWorkspace(localStorage);
      } catch (error) {
        if (active) {
          setBlockedStorage(true);
          setStorageWarning(
            `Saved data could not be opened: ${(error as Error).message} The stored file has been preserved.`,
          );
        }
      }
      const value = loaded ?? (await createDemo());
      if (active) {
        setWorkspace(value);
        setSelected(reviewQueue(value)[0]?.passage.id ?? "");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!workspace || blockedStorage || conflict) return;
    const error = persistWorkspace(workspace, localStorage);
    setStorageWarning(error ?? "");
  }, [workspace, blockedStorage, conflict]);

  useEffect(() => {
    const listener = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) setConflict(true);
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);

  if (!workspace)
    return (
      <main className="loading">
        <span className="brand-mark">
          <Layers3 size={23} />
        </span>
        <h1>Opening SourcePatch</h1>
        <p>Preparing your local workspace…</p>
      </main>
    );

  const queue = reviewQueue(workspace);
  const pending = queue.filter((item) => item.needsReview);
  const direct = queue.filter(
    (item) => item.state === "changed" || item.state === "missing",
  );
  const context = queue.filter((item) => item.state === "context");
  const unlinked = queue.filter((item) => item.state === "unlinked");
  const visible = queue.filter(
    (item) =>
      (filter === "all" ||
        (filter === "needs-review" && item.needsReview) ||
        (filter === "unlinked" && item.state === "unlinked")) &&
      `${item.passage.text} ${item.output.title}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const affectedOutputs = new Set(pending.map((item) => item.output.id)).size;

  const commit = (next: Workspace) => {
    if (conflict)
      throw new Error(
        "Another tab changed this workspace. Reload before saving to avoid overwriting its changes.",
      );
    if (blockedStorage)
      throw new Error(
        "Recover or replace the stored workspace before editing.",
      );
    setWorkspace(next);
    setNotice(
      "Review saved. The passage is linked to the current source snapshots.",
    );
  };
  const openSource = (id?: string) => {
    const source = workspace.sources.find((s) => s.id === id);
    setTitle(source?.title ?? "");
    setBody(source ? latest(source).body : "");
    setFormError("");
    setModal({ type: "source", id });
  };
  const openOutput = () => {
    setTitle("");
    setBody("");
    setSourceIds(workspace.sources.filter((s) => !s.archived).map((s) => s.id));
    setFormError("");
    setModal({ type: "output" });
  };
  const newWorkspace = () => {
    setTitle("My notebook workspace");
    setFormError("");
    setModal({ type: "new" });
  };
  const switchView = (next: View) => {
    setView(next);
    setNotice("");
  };
  const exportBackup = () =>
    downloadFile(
      `${safeFilename(workspace.name)}.sourcepatch.json`,
      JSON.stringify(workspace, null, 2),
      "application/json",
    );
  const saveForm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setFormError("");
    try {
      if (conflict)
        throw new Error(
          "Reload this tab before editing; another tab changed the workspace.",
        );
      if (blockedStorage && modal?.type !== "new" && modal?.type !== "restore")
        throw new Error(
          "Recover or replace the preserved workspace before editing.",
        );
      if (modal?.type === "source") {
        const next = modal.id
          ? await reviseSource(workspace, modal.id, body)
          : await addSource(workspace, title, body);
        setWorkspace(next);
        setNotice(
          modal.id
            ? "Source revision saved. Linked passages have been checked again."
            : "Source snapshot saved. You can now import a note that used this version.",
        );
      } else if (modal?.type === "output") {
        const next = addOutput(workspace, title, body, sourceIds, origin);
        setWorkspace(next);
        setView("review");
        setFilter("needs-review");
        setSearch("");
        setSelected(next.outputs.at(-1)!.passages[0].id);
        setNotice(
          "Note imported. Confirm the suggested evidence links before adding a source revision.",
        );
      } else if (modal?.type === "new") {
        if (!title.trim()) throw new Error("Give your workspace a name.");
        setWorkspace({ ...emptyWorkspace(), name: title.trim() });
        setSelected("");
        setView("sources");
        setBlockedStorage(false);
        setNotice("Your new workspace is ready. Start with a source snapshot.");
      } else if (modal?.type === "restore") {
        const restored = await parseWorkspace(modal.raw);
        setWorkspace(restored);
        setSelected(reviewQueue(restored)[0]?.passage.id ?? "");
        setView("review");
        setBlockedStorage(false);
        setNotice(
          "Workspace restored. Source fingerprints and evidence references were verified.",
        );
      }
      setModal(null);
    } catch (error) {
      setFormError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar" aria-label="Workspace navigation">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            switchView("review");
          }}
        >
          <span className="brand-mark">
            <Layers3 size={22} />
          </span>
          <span>
            SourcePatch
            <span className="brand-subtitle">A little more certain.</span>
          </span>
        </a>
        <div className="workspace-switch">
          <span className="workspace-avatar">
            <BookOpen size={17} />
          </span>
          <div>
            <strong>{workspace.name}</strong>
            <span>
              {workspace.sample ? "Sample workspace" : "Personal workspace"}
            </span>
          </div>
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {(
            [
              ["review", CheckCheck, "Review queue", pending.length],
              ["sources", Files, "Sources", workspace.sources.length],
              ["outputs", FileText, "Outputs", workspace.outputs.length],
              ["activity", History, "Review history", null],
            ] as const
          ).map(([name, Icon, label, count]) => (
            <button
              key={name}
              className={`nav-item ${view === name ? "active" : ""}`}
              aria-current={view === name ? "page" : undefined}
              onClick={() => switchView(name)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {count !== null && <span className="nav-count">{count}</span>}
            </button>
          ))}
        </nav>
        <span className="nav-label second-label">BEHIND THE PRODUCT</span>
        <button
          className={`nav-item ${view === "brief" ? "active" : ""}`}
          aria-current={view === "brief" ? "page" : undefined}
          onClick={() => switchView("brief")}
        >
          <Leaf size={18} />
          <span>Why this exists</span>
        </button>
        <a className="nav-item" href={repo} target="_blank" rel="noreferrer">
          <Code2 size={18} />
          <span>Code & evaluation</span>
          <ArrowUpRight size={14} />
        </a>
        <div className="sidebar-bottom">
          <div className="privacy-note">
            <ShieldCheck size={18} />
            <div>
              <strong>Stays in this browser</strong>
              <p>No account. No background uploads.</p>
            </div>
          </div>
          <button className="text-button" onClick={newWorkspace}>
            <Plus size={14} />
            New workspace
          </button>
          <button
            className="text-button"
            onClick={() => importRef.current?.click()}
          >
            <Upload size={14} />
            Restore backup
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumbs">
            <FolderOpen size={16} />
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {
                {
                  review: "Review queue",
                  sources: "Sources",
                  outputs: "Outputs",
                  activity: "Review history",
                  brief: "Product brief",
                }[view]
              }
            </strong>
          </div>
          <div className="top-actions">
            <details className="mobile-tools">
              <summary aria-label="More workspace actions">
                <MoreHorizontal size={19} />
              </summary>
              <div>
                <button onClick={newWorkspace}>New workspace</button>
                <button onClick={() => importRef.current?.click()}>
                  Restore backup
                </button>
                <button onClick={() => switchView("brief")}>
                  Why this exists
                </button>
                <a href={repo} target="_blank" rel="noreferrer">
                  Code & evaluation
                </a>
              </div>
            </details>
            <span className="local-label">
              <span />
              {storageWarning ? "Storage needs attention" : "Browser workspace"}
            </span>
            <button
              className="icon-button"
              onClick={() => setHelp(!help)}
              aria-label="How SourcePatch works"
              aria-expanded={help}
            >
              <CircleHelp size={20} />
            </button>
            <button className="button button-small" onClick={exportBackup}>
              <ArrowDownToLine size={15} />
              Export workspace
            </button>
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {conflict && (
            <div className="banner banner-error" role="alert">
              <span>
                Another tab changed this workspace. Reload before editing to
                preserve those changes.
              </span>
              <button className="text-button" onClick={() => location.reload()}>
                Reload
              </button>
            </div>
          )}
          {storageWarning && (
            <div className="banner banner-error" role="alert">
              <span>{storageWarning}</span>
              {blockedStorage && (
                <button
                  className="text-button"
                  onClick={() =>
                    downloadFile(
                      "sourcepatch-preserved-data.json",
                      localStorage.getItem(STORAGE_KEY) ?? "",
                      "application/json",
                    )
                  }
                >
                  Download preserved data
                </button>
              )}
            </div>
          )}
          {notice && (
            <div className="banner banner-notice" role="status">
              <CheckCheck size={16} />
              <span>{notice}</span>
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {help && (
            <section className="help-panel">
              <div>
                <span className="eyebrow">A SMALL, TRACEABLE WORKFLOW</span>
                <h2>From source change to reviewed note.</h2>
              </div>
              <ol>
                <li>
                  <strong>Save the original source.</strong> Use the version
                  your note was based on.
                </li>
                <li>
                  <strong>Import the note and link its evidence.</strong> Text
                  matches are suggestions to confirm.
                </li>
                <li>
                  <strong>Add a revised source.</strong> Review affected
                  passages, then export the updated note.
                </li>
              </ol>
              <p>
                Text and Markdown exports are supported. SourcePatch does not
                connect to your Google account or change anything inside
                NotebookLM.
              </p>
            </section>
          )}

          {view === "review" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span className="small-rule" />
                    FRESHNESS, WITH A PAPER TRAIL
                  </div>
                  <h1>
                    Your sources moved on.
                    <br />
                    Bring your notes along.
                  </h1>
                  <p>
                    See what changed, follow the evidence, and keep the final
                    say.
                  </p>
                </div>
                <button className="button button-primary" onClick={openOutput}>
                  <Plus size={17} />
                  Import output
                </button>
              </div>
              {workspace.sample && (
                <div className="sample-strip">
                  <Sparkles size={15} />
                  <span>
                    <strong>Try the sample.</strong> A workshop's participant
                    count, threshold and schedule have changed. All content is
                    fictional.
                  </span>
                  <button className="text-button" onClick={newWorkspace}>
                    Use your own files <ArrowRight size={14} />
                  </button>
                </div>
              )}
              <div className="stat-grid">
                <div className="stat-card">
                  <span>Passages to review</span>
                  <strong>
                    {pending.length}
                    <small> / {queue.length}</small>
                  </strong>
                  <p>
                    Across {affectedOutputs}{" "}
                    {affectedOutputs === 1 ? "output" : "outputs"}
                  </p>
                </div>
                <div className="stat-card">
                  <span>Evidence changed</span>
                  <strong>
                    {direct.length}
                    <i className="stat-dot amber" />
                  </strong>
                  <p>Linked text changed or is unavailable</p>
                </div>
                <div className="stat-card">
                  <span>Context changed</span>
                  <strong>
                    {context.length}
                    <i className="stat-dot blue" />
                  </strong>
                  <p>Same excerpt, updated surroundings</p>
                </div>
                <div className="stat-card">
                  <span>Evidence to link</span>
                  <strong>
                    {unlinked.length}
                    <i className="stat-dot gray" />
                  </strong>
                  <p>Needs a confirmed source connection</p>
                </div>
              </div>
              <div className="queue-toolbar">
                <div>
                  <h2>Review queue</h2>
                  <span>Changes first. Your judgment always.</span>
                </div>
                <div className="queue-controls">
                  <select
                    aria-label="Filter review queue"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="needs-review">Needs review</option>
                    <option value="all">All passages</option>
                    <option value="unlinked">Unlinked evidence</option>
                  </select>
                  <label className="search-field">
                    <Search size={15} />
                    <input
                      aria-label="Search passages"
                      placeholder="Find a passage"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                </div>
              </div>
              {!queue.length ? (
                <div className="empty-state">
                  <BookOpen size={35} />
                  <h2>Your review starts with a source.</h2>
                  <p>
                    Save the original source, import a note, and confirm its
                    evidence. Then add a source revision to see what needs
                    attention.
                  </p>
                  <button
                    className="button button-primary"
                    onClick={() => openSource()}
                  >
                    <Plus size={16} />
                    Add your first source
                  </button>
                </div>
              ) : (
                <div className="review-layout">
                  <section className="queue-list" aria-label="Passages">
                    {visible.map((item) => (
                      <button
                        key={item.passage.id}
                        className={`queue-item ${selected === item.passage.id ? "selected" : ""}`}
                        onClick={() => setSelected(item.passage.id)}
                        aria-pressed={selected === item.passage.id}
                      >
                        <div className="queue-item-top">
                          <span>{item.output.title}</span>
                          <span className="passage-number">
                            {String(item.index + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <p>{item.passage.text}</p>
                        <div className="queue-item-bottom">
                          <Status state={item.state} compact />
                          <ChevronRight size={16} />
                        </div>
                      </button>
                    ))}
                    {!visible.length && (
                      <div className="queue-empty">
                        <CheckCheck size={24} />
                        <strong>
                          {search
                            ? "No matching passages"
                            : "Nothing in this view"}
                        </strong>
                        <p>
                          {search
                            ? "Try another word or clear your search."
                            : "Choose All passages to see your reviewed notes."}
                        </p>
                      </div>
                    )}
                    <div className="queue-footnote">
                      <ShieldCheck size={14} />
                      <span>
                        Freshness tracking helps you review. It does not certify
                        that a claim is true.
                      </span>
                    </div>
                  </section>
                  <ReviewDetail
                    workspace={workspace}
                    passageId={selected || visible[0]?.passage.id || ""}
                    commit={commit}
                    onViewSource={(id) => setModal({ type: "inspect", id })}
                  />
                </div>
              )}
            </>
          )}

          {view === "sources" && (
            <>
              <div className="page-heading compact">
                <div>
                  <span className="eyebrow">THE FOUNDATION</span>
                  <h1>Sources, with memory.</h1>
                  <p>Keep each revision. See which outputs depend on it.</p>
                </div>
                <button
                  className="button button-primary"
                  onClick={() => openSource()}
                >
                  <Plus size={16} />
                  Add source
                </button>
              </div>
              <div className="info-strip">
                <Link2 size={18} />
                <p>
                  Start with the original version used to generate your note.
                  Later, use <strong>Add revision</strong> to compare updated
                  text. Files stay in this browser.
                </p>
              </div>
              <div className="source-grid">
                {workspace.sources.map((source) => {
                  const linked = queue.filter((item) =>
                    item.passage.evidence.some((e) => e.sourceId === source.id),
                  ).length;
                  return (
                    <article
                      className={`source-card ${source.archived ? "archived" : ""}`}
                      key={source.id}
                    >
                      <div className="source-card-top">
                        <span className="file-icon">
                          <FileText size={22} />
                        </span>
                        <span className="version-chip">
                          {source.archived
                            ? "Archived"
                            : `Version ${source.versions.length}`}
                        </span>
                      </div>
                      <h2>{source.title}</h2>
                      <p className="source-preview">{latest(source).body}</p>
                      <div className="source-facts">
                        <span>
                          <Link2 size={13} />
                          {linked} linked passages
                        </span>
                        <span>{source.versions.length} snapshots</span>
                      </div>
                      <div className="source-actions">
                        <button
                          className="button button-small"
                          onClick={() =>
                            setModal({ type: "inspect", id: source.id })
                          }
                        >
                          View source
                        </button>
                        <button
                          className="button button-small button-primary"
                          disabled={source.archived}
                          onClick={() => openSource(source.id)}
                        >
                          Add revision
                        </button>
                      </div>
                      <button
                        className="text-button archive-button"
                        onClick={() => {
                          try {
                            commit(archiveSource(workspace, source.id));
                            setNotice(
                              source.archived
                                ? "Source restored."
                                : "Source archived. Its history is preserved.",
                            );
                          } catch (error) {
                            setNotice((error as Error).message);
                          }
                        }}
                      >
                        {source.archived ? "Restore source" : "Archive source"}
                      </button>
                    </article>
                  );
                })}
              </div>
              {!workspace.sources.length && (
                <div className="empty-state">
                  <Files size={34} />
                  <h2>Add the source your note was based on.</h2>
                  <p>
                    Paste text or choose a .txt or .md file. Start with one
                    document.
                  </p>
                  <button
                    className="button button-primary"
                    onClick={() => openSource()}
                  >
                    Add source
                  </button>
                </div>
              )}
            </>
          )}

          {view === "outputs" && (
            <>
              <div className="page-heading compact">
                <div>
                  <span className="eyebrow">WHAT YOU TAKE FORWARD</span>
                  <h1>Notes worth revisiting.</h1>
                  <p>
                    Import exported text, review its evidence, then take your
                    work with you.
                  </p>
                </div>
                <button className="button button-primary" onClick={openOutput}>
                  <Plus size={16} />
                  Import output
                </button>
              </div>
              <div className="output-grid">
                {workspace.outputs.map((output) => {
                  const needs = output.passages.filter(
                    (p) => inspectPassage(p, workspace.sources).needsReview,
                  ).length;
                  return (
                    <article className="output-card" key={output.id}>
                      <div className="output-card-heading">
                        <span className="file-icon">
                          <BookOpen size={22} />
                        </span>
                        <div>
                          <h2>{output.title}</h2>
                          <span>
                            {output.origin} · {output.passages.length} passages
                          </span>
                        </div>
                        <span className={`output-count ${needs ? "" : "done"}`}>
                          {needs ? `${needs} to review` : "Sources unchanged"}
                        </span>
                      </div>
                      <div className="output-passages">
                        {output.passages.map((passage, i) => (
                          <div key={passage.id}>
                            <span className="passage-index">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <p>{passage.text}</p>
                            <Status
                              state={
                                inspectPassage(passage, workspace.sources).state
                              }
                              compact
                            />
                          </div>
                        ))}
                      </div>
                      <div className="output-actions">
                        <button
                          className="text-button"
                          onClick={() => {
                            setSelected(output.passages[0].id);
                            setView("review");
                            setFilter("all");
                            setSearch("");
                          }}
                        >
                          Review passages <ArrowRight size={15} />
                        </button>
                        <button
                          className="button button-small"
                          onClick={() =>
                            downloadFile(
                              `${safeFilename(output.title)}.md`,
                              exportOutput(output, workspace),
                              "text/markdown",
                            )
                          }
                        >
                          <ArrowDownToLine size={14} />
                          Export note
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              {!workspace.outputs.length && (
                <div className="empty-state">
                  <BookOpen size={34} />
                  <h2>Bring a note into the workspace.</h2>
                  <p>
                    Use text exported from NotebookLM, or any note whose sources
                    you want to track.
                  </p>
                  <button
                    className="button button-primary"
                    onClick={openOutput}
                  >
                    Import output
                  </button>
                </div>
              )}
            </>
          )}

          {view === "activity" && (
            <>
              <div className="page-heading compact">
                <div>
                  <span className="eyebrow">DECISIONS YOU CAN REVISIT</span>
                  <h1>A record of your reasoning.</h1>
                  <p>
                    Source revisions, reviewed wording and the evidence behind
                    each decision.
                  </p>
                </div>
              </div>
              {workspace.sample && (
                <div className="info-strip">
                  <CircleHelp size={18} />
                  <p>
                    The initial entries are part of the fictional sample. Your
                    own actions are recorded as you work.
                  </p>
                </div>
              )}
              <div className="timeline">
                {workspace.audit.map((entry) => (
                  <article className="timeline-entry" key={entry.id}>
                    <span className="timeline-icon">
                      {entry.action === "passage-reviewed" ? (
                        <CheckCheck size={17} />
                      ) : (
                        <Clock3 size={17} />
                      )}
                    </span>
                    <div>
                      <div className="timeline-title">
                        <h2>{entry.subject}</h2>
                        <time dateTime={entry.at}>{dateLabel(entry.at)}</time>
                      </div>
                      <span className="eyebrow">
                        {entry.action.replace(/-/g, " ")}
                      </span>
                      <p>{entry.detail}</p>
                      {entry.before && entry.after && (
                        <details>
                          <summary>View reviewed wording and evidence</summary>
                          <WordDiff before={entry.before} after={entry.after} />
                          <ul>
                            {entry.evidence?.map((e, i) => (
                              <li key={i}>
                                <strong>
                                  {
                                    workspace.sources.find(
                                      (s) => s.id === e.sourceId,
                                    )?.title
                                  }
                                </strong>
                                <blockquote>{e.quote}</blockquote>
                                <code>Snapshot {e.versionId}</code>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </article>
                ))}
              </div>
              {!workspace.audit.length && (
                <div className="empty-state">
                  <History size={32} />
                  <h2>Your paper trail starts here.</h2>
                  <p>
                    Adding a source or reviewing a passage will create a record.
                  </p>
                </div>
              )}
            </>
          )}

          {view === "brief" && (
            <>
              <div className="page-heading compact">
                <div>
                  <span className="eyebrow">
                    A PRODUCT QUESTION, MADE TANGIBLE
                  </span>
                  <h1>
                    When sources change,
                    <br />
                    what should happen next?
                  </h1>
                  <p>
                    SourcePatch explores a documented gap in the notebook
                    workflow.
                  </p>
                </div>
                <span className="brief-leaf">
                  <Leaf size={42} />
                </span>
              </div>
              <div className="brief-grid">
                <section className="brief-card">
                  <span className="eyebrow">01 / THE PROBLEM</span>
                  <h2>Updated sources. Older outputs.</h2>
                  <p>
                    Google documents that changing or deleting a notebook source
                    does not update previously generated Studio outputs. Source
                    synchronization and output freshness are different problems.
                  </p>
                  <a
                    href="https://support.google.com/gemininotebook/answer/16215270?hl=en"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read Google's documentation <ArrowUpRight size={14} />
                  </a>
                </section>
                <section className="brief-card">
                  <span className="eyebrow">02 / THE PRODUCT DECISION</span>
                  <h2>Help a person review the change.</h2>
                  <p>
                    SourcePatch tracks evidence, prioritizes changed excerpts,
                    and surfaces changes elsewhere in the source. Text
                    similarity suggests links; a person confirms them and
                    approves every revision.
                  </p>
                  <a
                    href={`${repo}/blob/main/docs/PRODUCT.md`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Requirements & tradeoffs <ArrowUpRight size={14} />
                  </a>
                </section>
                <section className="brief-card">
                  <span className="eyebrow">03 / THE EVIDENCE</span>
                  <h2>Reproducible checks. Honest limits.</h2>
                  <p>
                    The public evaluation uses authored revision scenarios and
                    explicit baselines. It tests freshness tracking, not
                    semantic correctness. No user adoption, time savings or
                    retention improvement is claimed.
                  </p>
                  <a
                    href={`${repo}/blob/main/evaluation/RESULTS.md`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Evaluation & results <ArrowUpRight size={14} />
                  </a>
                </section>
                <section className="brief-card">
                  <span className="eyebrow">04 / WHAT COMES NEXT</span>
                  <h2>Earn a place in the workflow.</h2>
                  <p>
                    The next study should compare review accuracy and time
                    against manual checking. It must account for the cost of
                    linking evidence. A useful system should reduce total effort
                    without hiding consequential changes.
                  </p>
                  <a
                    href={`${repo}/blob/main/docs/RESEARCH_PLAN.md`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Proposed user study <ArrowUpRight size={14} />
                  </a>
                </section>
              </div>
              <div className="scope-card">
                <ShieldCheck size={23} />
                <div>
                  <h2>Independent companion. Your data stays yours.</h2>
                  <p>
                    This app works with pasted or exported text and Markdown. It
                    does not connect to Google accounts, update native
                    NotebookLM notebooks, or regenerate audio/video. The browser
                    app sends no document data to a server. Optional
                    Gemini-assisted review is a separate, explicitly invoked
                    local tool.
                  </p>
                  <p>
                    Built by Guhan Purushothaman with AI-assisted development.
                    Not affiliated with or endorsed by Google.
                  </p>
                </div>
              </div>
            </>
          )}
          <footer className="page-footer">
            <span>SourcePatch · Keep the evidence close.</span>
            <span>Independent companion for exported notebook content.</span>
          </footer>
        </main>
      </div>
      <input
        ref={importRef}
        type="file"
        accept=".json"
        className="visually-hidden"
        aria-label="Restore workspace file"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            const raw = await readFile(file, [".json"]);
            await parseWorkspace(raw);
            setFormError("");
            setModal({ type: "restore", raw, name: file.name });
          } catch (error) {
            setNotice(`Import failed: ${(error as Error).message}`);
          }
        }}
      />
      {modal && (
        <Dialog
          title={
            modal.type === "source"
              ? modal.id
                ? `Revise ${title}`
                : "Add a source snapshot"
              : modal.type === "output"
                ? "Import a notebook output"
                : modal.type === "new"
                  ? "Start a new workspace"
                  : modal.type === "restore"
                    ? "Restore a workspace backup"
                    : (workspace.sources.find((s) => s.id === modal.id)
                        ?.title ?? "Source")
          }
          onClose={() => {
            if (!busy) setModal(null);
          }}
          wide={modal.type === "inspect"}
        >
          {modal.type === "inspect" ? (
            <SourceInspector
              source={workspace.sources.find((s) => s.id === modal.id)!}
            />
          ) : (
            <form onSubmit={saveForm} className="dialog-form">
              {(modal.type === "source" || modal.type === "output") && (
                <>
                  <p className="muted">
                    {modal.type === "source"
                      ? modal.id
                        ? "Save the revised source as a new snapshot. Existing snapshots and review decisions are retained."
                        : "Use the original source version your note was based on. Add revisions after linking the note to its evidence."
                      : "Paste an exported note or choose a text file. Blank lines separate passages. Suggested evidence links require your confirmation."}
                  </p>
                  {!(modal.type === "source" && modal.id) && (
                    <>
                      <label className="field-label" htmlFor="item-title">
                        Title
                      </label>
                      <input
                        id="item-title"
                        autoFocus
                        value={title}
                        maxLength={160}
                        required
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={
                          modal.type === "source"
                            ? "e.g. Research methods handbook"
                            : "e.g. Exam revision guide"
                        }
                      />
                    </>
                  )}
                  <label className="file-upload">
                    <Upload size={17} />
                    <span>Choose a .txt or .md file</span>
                    <input
                      aria-label={
                        modal.type === "source"
                          ? "Import source text file"
                          : "Import output text file"
                      }
                      type="file"
                      accept=".txt,.md"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        try {
                          const value = await readFile(file, [".txt", ".md"]);
                          if (value.length > MAX_TEXT)
                            throw new Error(
                              "Text files can contain up to 40,000 characters.",
                            );
                          setBody(value);
                          if (!title)
                            setTitle(file.name.replace(/\.[^.]+$/, ""));
                          setFormError("");
                        } catch (error) {
                          setFormError((error as Error).message);
                        }
                      }}
                    />
                  </label>
                  <label className="field-label" htmlFor="item-body">
                    {modal.type === "source" ? "Source text" : "Output text"}
                  </label>
                  <textarea
                    id="item-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    maxLength={MAX_TEXT}
                    required
                    rows={9}
                    placeholder="Paste the text here…"
                  />
                  <span className="character-count">
                    {body.length.toLocaleString()} / 40,000 characters
                  </span>
                  {modal.type === "output" && (
                    <>
                      <label className="field-label" htmlFor="output-origin">
                        Where did this note come from?
                      </label>
                      <select
                        id="output-origin"
                        value={origin}
                        onChange={(e) =>
                          setOrigin(e.target.value as Output["origin"])
                        }
                      >
                        <option>NotebookLM export</option>
                        <option>Other notes</option>
                      </select>
                      <fieldset className="source-picker">
                        <legend>Sources used for this output</legend>
                        {workspace.sources
                          .filter((s) => !s.archived)
                          .map((s) => (
                            <label className="checkbox-label" key={s.id}>
                              <input
                                type="checkbox"
                                checked={sourceIds.includes(s.id)}
                                onChange={(e) =>
                                  setSourceIds(
                                    e.target.checked
                                      ? [...sourceIds, s.id]
                                      : sourceIds.filter((id) => id !== s.id),
                                  )
                                }
                              />
                              <span>
                                {s.title} · v{s.versions.length}
                              </span>
                            </label>
                          ))}
                        {!workspace.sources.some((s) => !s.archived) && (
                          <p className="microcopy">
                            No sources yet. You can import now and link evidence
                            after adding a source.
                          </p>
                        )}
                      </fieldset>
                    </>
                  )}
                </>
              )}
              {modal.type === "new" && (
                <>
                  <p className="muted">
                    This replaces the workspace in this browser. Export a backup
                    to keep your current sources, notes and review history.
                  </p>
                  <button
                    className="button"
                    type="button"
                    onClick={exportBackup}
                  >
                    <ArrowDownToLine size={15} />
                    Export current workspace
                  </button>
                  <label className="field-label" htmlFor="workspace-name">
                    New workspace name
                  </label>
                  <input
                    id="workspace-name"
                    autoFocus
                    value={title}
                    required
                    maxLength={160}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </>
              )}
              {modal.type === "restore" && (
                <>
                  <p className="muted">
                    Restore <strong>{modal.name}</strong>? The file has passed
                    format, fingerprint and evidence checks. It will replace the
                    workspace in this browser.
                  </p>
                  <button
                    className="button"
                    type="button"
                    onClick={exportBackup}
                  >
                    <ArrowDownToLine size={15} />
                    Export current workspace first
                  </button>
                </>
              )}
              {formError && (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              )}
              <div className="dialog-footer">
                <button
                  type="button"
                  className="button"
                  onClick={() => setModal(null)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  type="submit"
                  disabled={busy}
                >
                  {busy
                    ? "Saving…"
                    : modal.type === "source"
                      ? modal.id
                        ? "Save revision"
                        : "Save source"
                      : modal.type === "output"
                        ? "Import output"
                        : modal.type === "new"
                          ? "Create workspace"
                          : "Restore workspace"}
                  <ArrowRight size={15} />
                </button>
              </div>
            </form>
          )}
        </Dialog>
      )}
    </div>
  );
}
