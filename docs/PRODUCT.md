# SourcePatch product brief

**Decision date:** 12 November 2026

**Owner:** Guhan Purushothaman

**Stage:** Independent working prototype, with automated validation. No user pilot completed.

## The user problem

A student or analyst creates a useful summary from documents. Later, the documents change. The summary can remain polished, shareable and outdated. SourcePatch makes the maintenance step explicit: locate changed evidence, inspect its implications, approve a revision, and preserve the reasoning.

Google's [notebook source documentation](https://support.google.com/gemininotebook/answer/16215270?hl=en) states that source changes do not update already-generated Studio outputs. Drive source synchronization already exists. The product opportunity is maintaining the outputs downstream of those revisions.

This establishes a product behavior, not its frequency or severity for every user. Demand for a separate companion and tolerance for evidence-link setup remain unvalidated.

## Initial audience and job to be done

**Initial segment:** people maintaining text study guides or research briefs from a small collection of documents they can export and understand. Mathematics coursework is a useful pilot context because changes to quantities, conditions and exceptions can matter even when surrounding wording looks similar.

**Job:** When my source material changes, help me find the passages I should revisit and keep a record of why I changed or retained them.

**Not the first audience:** casual one-off summarization, audio/video-only workflows, enterprise compliance teams, or anyone needing automated factual certification. Those use cases have materially different integration, scale or assurance needs.

## Product hypothesis and strategic fit

Hypothesis: explicit dependencies and a clear review queue can reduce consequential omissions while keeping total review effort acceptable. Total effort includes initial evidence linking, not just the final correction step.

Potential value for Google's notebook products is improved trust when users reuse generated material. Better retention or paid conversion is a downstream hypothesis, not a measured result. Integration might eventually remove duplicate data entry, but this prototype does not assume access to private Google APIs or production user data.

## Alternatives considered

| Alternative | Advantage | Reason for the current decision |
| --- | --- | --- |
| Regenerate every output after any source update | Simple policy | Rewrites unchanged content, loses edited wording, and still needs verification |
| Keep old outputs with a notebook-wide stale badge | Low implementation cost | Gives little help locating affected passages |
| Check only whether a quoted excerpt survives | Specific, inexpensive | Misses qualifications or exceptions added elsewhere |
| Let an LLM automatically rewrite and approve | Low visible user effort | Model errors and uncertain evidence can silently become trusted content |
| SourcePatch's explicit review workflow | Traceable decisions and scoped dependencies | More setup and possible over-alerting; must be tested with users |

## Version 1 requirements and shipped behavior

| Priority | Requirement | Implementation / acceptance evidence |
| --- | --- | --- |
| P0 | Usable without an account or API key | Browser-only app; fictional sample and custom-file workflow |
| P0 | Preserve source history | Immutable snapshots with SHA-256 content fingerprints |
| P0 | Make uncertainty visible | Five review states; unconfirmed links never appear current |
| P0 | Handle changes outside the citation | Separate context-review category, with full source diff |
| P0 | Human-owned revisions | Explicit evidence selection, approval checkbox, rationale for unchanged wording |
| P0 | Reopen on later updates | Reviews link to a particular version; new changes invalidate that snapshot |
| P0 | Portable ownership | Markdown output and validated JSON backup/restore |
| P0 | Recover from local failures | Storage warnings, preserved corrupt data, cross-tab conflict warning |
| P0 | Accessible interaction | Keyboard dialogs, labeled fields, responsive layouts, automated WCAG checks |
| P1 | Optional semantic suggestions | Explicit local Gemini CLI, structured output, exact quote validation, no automatic application |
| Later | Native document ingestion | Consider only after proving the review workflow is useful |
| Later | Real-world semantic evaluation | Independent labels, permissioned revisions and frozen evaluation set |

## Why the states work this way

- **Evidence changed:** a confirmed excerpt is no longer present in the current source. This is a review trigger, not a verdict that the note is false.
- **Context changed:** the excerpt survives, but the rest of the source changed. The current version may add an exception or limitation.
- **Link evidence:** no evidence is linked, a suggested match has not been confirmed, or the original link cannot be resolved.
- **Source unavailable:** a source is missing or archived.
- **No source change:** the source is unchanged from the reviewed/linked snapshot. This does not establish truth or completeness.

When a passage has multiple dependencies, the highest-priority unresolved state appears in its queue label; individual source details remain visible. A user can re-link a passage to current evidence and keep the wording with a reason. Future source changes reopen it.

## Measurement plan

The measurement approach follows the goal → signal → metric idea in [Google's HEART research](https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/). The choice of goals and metrics below is this project's own proposal.

| Goal | Signal | Metric / guardrail | Current evidence |
| --- | --- | --- | --- |
| Avoid reusing outdated passages | Relevant revisions receive review | Missed review needs; incorrect retained claims after human review | Authored regression fixtures only |
| Keep maintenance practical | People finish a correct update | Total setup + review time; completed tasks | User study proposed, not run |
| Make provenance understandable | People can explain their decision | Correct evidence attribution; unresolved-link rate | Automated reference checks; user comprehension unmeasured |
| Preserve user control | Changes are explicit and reversible via history/backup | Silent modifications; successful export/restore; subsequent invalidation | Automated lifecycle and browser tests |
| Sustain usefulness | Users return with another source revision | Repeat revision/review cycle completion | No usage or retention data collected |

## Scope and constraints

- Text/Markdown only. No direct Google account connection, Drive auto-sync, PDF parsing, or audio/video regeneration.
- Local storage is convenient but not encrypted cloud backup. Data is scoped to this browser profile and origin; clearing site data removes it. Export is the recovery path.
- Up to 20 sources, 30 revisions per source, 20 outputs, 100 passages per output; source text up to 40,000 characters. Workspace saves stop near 1.8 MB so a 2 MB backup stays importable. These are deliberate prototype limits, not scale claims.
- Citation matching is lexical TF-IDF. It can fail on paraphrases, multilingual text, tables or equations. A match is always a suggestion.
- Existing claims can be wrong before any source changes. SourcePatch is not a factual verifier.
- Context detection is conservative; harmless edits may require review. That cost is visible in the proposed study.
- The optional Gemini path requires an explicitly configured key and model. A real provider request was not executed in the development environment because no key was configured. Transport, validation and failure handling are tested with mocked responses.

## Launch decision

Release as an independent, open-source prototype with an interactive sample, setup instructions, reproducible evaluation and visible limits. Do not present it as a Google integration, Google-endorsed feature, production security product or validated business success.

Before claiming user impact, complete the proposed comparative study. Before scaling to a direct integration, validate demand, obtain appropriate authorization, assess API support and compare integration cost against total review effort saved.

## Skills demonstrated against the Google APM role

The [specific role](https://www.google.com/about/careers/applications/jobs/results/101007950268506822-associate-product-manager-university-graduate-2027-start) asks for user and market understanding, product launch and iteration, technical/analytical work and collaboration. This project supplies reviewable artifacts for problem investigation, requirements, design, implementation, evaluation, communication and launch tradeoffs. The research plan shows how actual stakeholder collaboration should be added; it does not claim interviews or cross-functional teamwork that did not occur.
