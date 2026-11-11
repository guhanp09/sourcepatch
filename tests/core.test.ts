import { describe, it, expect } from "vitest";
import { scenarios, fixture } from "../evaluation/fixtures";
import {
  inspectPassage,
  suggestEvidence,
  sourceExcerpts,
} from "../src/core/engine";
import { createDemo } from "../src/core/demo";
import {
  addSource,
  reviseSource,
  addOutput,
  saveReview,
  archiveSource,
} from "../src/core/actions";
import {
  emptyWorkspace,
  latest,
  parseWorkspace,
  digest,
} from "../src/core/model";
import { exportOutput } from "../src/core/export";
import { persistWorkspace, loadWorkspace } from "../src/core/storage";

describe("freshness policy across explicit source revisions", () => {
  it.each(scenarios)("$id: $reason", async (scenario) => {
    const { passage, sources, expected } = await fixture(scenario);
    expect(inspectPassage(passage, sources).state).toBe(expected);
  });
  it("prioritizes a missing dependency when other sources remain unchanged", async () => {
    const data = await fixture(scenarios.find((s) => s.id === "unchanged")!);
    data.passage.evidence.push({
      sourceId: "absent",
      versionId: "none",
      quote: "Missing",
      confirmed: true,
    });
    expect(inspectPassage(data.passage, data.sources).state).toBe("missing");
  });
  it("does not treat lexical similarity as confirmed evidence", async () => {
    const workspace = await createDemo();
    const matches = suggestEvidence(
      "The exercise uses 80 participants split between treatment and control.",
      workspace.sources,
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].confirmed).toBe(false);
    expect(matches[0].quote).toContain("80");
  });
  it("does not create an evidence link from unrelated vocabulary", async () => {
    const workspace = await createDemo();
    expect(
      suggestEvidence(
        "Volcanic basalt crystallizes underground.",
        workspace.sources,
      ),
    ).toEqual([]);
  });
  it("makes long source paragraphs selectable while preserving exact excerpts", () => {
    const body = "Long source paragraph with preserved evidence. ".repeat(500);
    const excerpts = sourceExcerpts(body);
    expect(excerpts.length).toBeGreaterThan(1);
    expect(
      excerpts.every((quote) => quote.length <= 6000 && body.includes(quote)),
    ).toBe(true);
  });
});

describe("review lifecycle", () => {
  it("requires current, confirmed evidence and records the review before reopening on a later source edit", async () => {
    let workspace = await createDemo();
    const passage = workspace.outputs[0].passages[0];
    const source = workspace.sources[0];
    expect(() =>
      saveReview(
        workspace,
        passage.id,
        "80 participants.",
        passage.evidence,
        "Updated",
      ),
    ).toThrow("latest");
    const evidence = [
      {
        sourceId: source.id,
        versionId: latest(source).id,
        quote: latest(source).body.split("\n\n")[1],
        confirmed: true,
      },
    ];
    workspace = saveReview(
      workspace,
      passage.id,
      "Plan for 80 participants: 40 in each group.",
      evidence,
      "Updated both total and group sizes.",
    );
    expect(
      inspectPassage(workspace.outputs[0].passages[0], workspace.sources).state,
    ).toBe("current");
    expect(workspace.audit[0].before).toContain("60");
    expect(workspace.audit[0].after).toContain("80");
    expect(workspace.audit[0].evidence).toEqual(evidence);
    workspace = await reviseSource(
      workspace,
      source.id,
      latest(source).body.replace("80 participants", "100 participants"),
    );
    expect(
      inspectPassage(workspace.outputs[0].passages[0], workspace.sources).state,
    ).toBe("changed");
  });
  it("requires reasoning when the reviewer keeps existing wording", async () => {
    const workspace = await createDemo();
    const passage = workspace.outputs[2].passages[0];
    expect(() =>
      saveReview(workspace, passage.id, passage.text, passage.evidence, ""),
    ).toThrow("short reason");
  });
  it("rejects fabricated quotations and empty evidence", async () => {
    const workspace = await createDemo();
    const passage = workspace.outputs[0].passages[0];
    const source = workspace.sources[0];
    expect(() =>
      saveReview(workspace, passage.id, "New wording.", [], "Updated"),
    ).toThrow("at least one");
    expect(() =>
      saveReview(
        workspace,
        passage.id,
        "New wording.",
        [
          {
            sourceId: source.id,
            versionId: latest(source).id,
            quote: "Invented source text.",
            confirmed: true,
          },
        ],
        "Updated",
      ),
    ).toThrow("Evidence must");
  });
  it("allows reversible archiving without deleting snapshots", async () => {
    const original = await createDemo();
    const source = original.sources[0];
    const archived = archiveSource(original, source.id);
    expect(archived.sources[0].versions).toEqual(source.versions);
    expect(
      inspectPassage(archived.outputs[0].passages[0], archived.sources).state,
    ).toBe("missing");
    expect(archiveSource(archived, source.id).sources[0].archived).toBe(false);
  });
  it("rejects unchanged revisions without mutating the source", async () => {
    const workspace = await createDemo();
    await expect(
      reviseSource(
        workspace,
        workspace.sources[0].id,
        latest(workspace.sources[0]).body,
      ),
    ).rejects.toThrow("no new revision");
    expect(workspace.sources[0].versions).toHaveLength(2);
  });
  it("supports a complete custom source and note import with unconfirmed matches", async () => {
    let workspace = await addSource(
      emptyWorkspace(),
      "Lecture",
      "Sample sizes depend on study design.\n\nReport uncertainty.",
    );
    workspace = addOutput(
      workspace,
      "Revision",
      "Sample sizes depend on study design.\n\nReport uncertainty.",
      [workspace.sources[0].id],
      "Other notes",
    );
    expect(workspace.outputs[0].passages).toHaveLength(2);
    expect(
      inspectPassage(workspace.outputs[0].passages[0], workspace.sources).state,
    ).toBe("unlinked");
  });
  it("exports outstanding review status and source fingerprints rather than hiding uncertainty", async () => {
    const workspace = await createDemo();
    const result = exportOutput(workspace.outputs[0], workspace);
    expect(result).toContain("3 of 3 passages still need review");
    expect(result).toContain("Evidence changed");
    expect(result).toContain("Context changed");
    expect(result).toContain(latest(workspace.sources[0]).digest);
  });
});

describe("data integrity and failure recovery", () => {
  it("round-trips a complete workspace with verified content fingerprints", async () => {
    const workspace = await createDemo();
    expect(await parseWorkspace(JSON.stringify(workspace))).toEqual(workspace);
  });
  it("rejects malformed and oversized JSON", async () => {
    await expect(parseWorkspace("{broken")).rejects.toThrow("valid JSON");
    await expect(parseWorkspace("x".repeat(2_000_001))).rejects.toThrow("2 MB");
  });
  it("rejects tampered source bodies", async () => {
    const workspace = await createDemo();
    workspace.sources[0].versions[0].body = "Tampered content.";
    await expect(parseWorkspace(JSON.stringify(workspace))).rejects.toThrow(
      "fingerprint",
    );
  });
  it("rejects broken evidence references even if source hashes are valid", async () => {
    const workspace = await createDemo();
    workspace.outputs[0].passages[0].evidence[0].quote = "No such text.";
    await expect(parseWorkspace(JSON.stringify(workspace))).rejects.toThrow(
      "missing evidence",
    );
  });
  it("rejects duplicate identifiers and unknown schema keys", async () => {
    const workspace = await createDemo();
    workspace.outputs[0].id = workspace.sources[0].id;
    await expect(parseWorkspace(JSON.stringify(workspace))).rejects.toThrow(
      "duplicate",
    );
    await expect(
      parseWorkspace(JSON.stringify({ ...workspace, unexpected: "field" })),
    ).rejects.toThrow("format");
  });
  it("normalizes canonical encodings but preserves mathematical and code changes", async () => {
    expect(await digest("Café\r\nDiscuss")).toBe(await digest("Café\nDiscuss"));
    expect(await digest("[0,1]")).not.toBe(await digest("(0,1)"));
    expect(await digest("if x:\n  run()")).not.toBe(
      await digest("if x:\nrun()"),
    );
  });
  it("surfaces failed persistence instead of reporting a successful save", async () => {
    const workspace = await createDemo();
    const result = persistWorkspace(workspace, {
      setItem() {
        throw new Error("QuotaExceededError");
      },
    });
    expect(result).toContain("in memory only");
  });
  it("preserves corrupted saved data for recovery", async () => {
    let raw = "{bad json";
    await expect(loadWorkspace({ getItem: () => raw })).rejects.toThrow(
      "valid JSON",
    );
    expect(raw).toBe("{bad json");
  });
});
