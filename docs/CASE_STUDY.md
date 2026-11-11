# SourcePatch: maintaining trust after the source changes

**Guhan Purushothaman · Independent product and engineering project · November 2026**

## Problem and evidence

Google documents that updating notebook sources does not revise existing Studio outputs. A note may therefore outlive the evidence used to create it. The full [research shortlist](PROJECT_SHORTLIST.md) compares this opportunity with YouTube dubbing review, Drive access previews, accessible Maps arrivals and offline Forms collection.

## Decision

Build a focused companion for text exports. The workflow preserves source snapshots, links passages to evidence and asks a person to review affected material. The most important design choice is surfacing changes outside a surviving quote: a newly added exception can invalidate a claim even when its citation text remains unchanged.

## What was built

A responsive browser app with original/revised source import, suggested evidence links, five review states, word-level source comparison, human-approved corrections, review history, Markdown export and validated JSON backup/restore. It works without an account and stores documents locally. An optional Gemini CLI generates draft review suggestions, validates exact source quotations and never applies changes automatically.

## Evaluation

The repository includes 26 authored regression scenarios, three baseline policies and a reproducible [results report](../evaluation/RESULTS.md). Unit/integration and browser tests cover subsequent source revisions, malformed imports, conflicting tabs, storage failure, markup safety, keyboard interaction and automated accessibility checks.

In the authored scenarios, checking only the cited excerpt misses six context-review cases. This supports testing a distinct context-review state, but does not establish real-world accuracy. The fixtures are not an independent held-out dataset. No user study, adoption, retention or time-saving result is claimed. Live Gemini response quality has not been measured because no API key was configured during development.

## Product judgment made visible

The project documents user segmentation, existing-feature checks, alternative solutions, scope, privacy choices, measurement definitions and a proposed comparative study. The initial release favors reviewability and explicit uncertainty over silently rewriting material. The next go/no-go question is whether initial linking plus ongoing review takes less effort than the user's existing workflow while preventing consequential omissions.

## Relevance to Google APM work

It addresses a Google product behavior using primary research, translates a user need into requirements and a working feature, and tests product tradeoffs with measurable outcomes. The documentation provides evidence of analytical thinking, technical execution, design and communication. It does not claim access to Google systems, internal team experience or customer collaboration that did not happen.

## Authorship and tooling

This project was developed with substantial AI assistance for research, implementation, tests and documentation under Guhan's direction. Dataset examples are authored fixtures, not customer data. All reviewer actions in the default workspace are clearly labeled as a fictional sample. The repository makes the implementation and limits inspectable.

## Demo narrative

1. Open the sample: a note still says 60 participants after the source changes to 80.
2. Inspect the word diff and current evidence. Update both total and per-group counts.
3. Approve the wording and see the recorded source version.
4. Open the unchanged random-assignment passage: the quote survives, but the source has added a generalization limitation.
5. Show the unlinked claim and explain why the product refuses to label it current.
6. Export a note with unresolved statuses visible, then show the evaluation and its limits.

## Portfolio description

Built SourcePatch, a local-first review companion for exported NotebookLM notes, with versioned evidence, change prioritization and human-approved corrections; documented product requirements and evaluated freshness policies across 26 reproducible revision scenarios.

Use this description only alongside the documented scope. Do not replace “revision scenarios” with real users, claim a live Google integration, or describe unmeasured improvements as outcomes.
