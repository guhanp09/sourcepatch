# Proposed user research and product evaluation

**Status: planned, not conducted.** No participant quotes, time-saving figures, adoption or retention claims are reported.

## Question to resolve first

Does the review workflow prevent consequential omissions at an acceptable **total** cost, including initial evidence linking? A faster correction screen is insufficient if setup takes longer than the work it saves.

## Discovery

Recruit people who already maintain study guides or research briefs from changing documents. Ask for a recent concrete example: what changed, how they discovered it, what they did next, and what they missed. Observe their existing workflow. Seek disconfirming evidence: one-off outputs, no revisions, or a preference to regenerate everything may make SourcePatch unnecessary.

Begin with 6–8 interviews for discovery, not a representative prevalence estimate. Collect permissioned examples with identifying information removed. Do not assume IIT Madras students or teachers have agreed to participate.

## Comparative usability pilot

An exploratory pilot could include 8–12 participants. This is a usability sample, not a powered population-level experiment. If results justify a causal effectiveness study, estimate variance and choose the sample size before collecting that study's data.

Prepare two matched, permissioned document sets with independently labeled revisions. Include changed quantities, removed evidence, new exceptions outside a surviving quote, harmless edits and unchanged dependencies. Freeze the test set before tuning the system. Use domain reviewers to define which note passages actually need correction.

Counterbalance task set and workflow order. Each participant maintains one guide using their normal document comparison method and another with SourcePatch. Count evidence linking, review, editing and export time. Avoid showing the same corrections twice to the same person.

## Outcomes

| Outcome | Operational definition |
| --- | --- |
| Consequential omissions | Incorrect or unsupported passages remaining after the participant finishes, judged independently |
| Total time | Initial setup plus revision review and correction, including recovery from mistakes |
| Unnecessary changes | Correct passages made worse or needlessly rewritten |
| Evidence comprehension | Participant correctly explains which version and excerpt justify a selected passage |
| Workflow completion | Correct export produced without assistance |
| Perceived effort | Short post-task rating plus explanation; reported separately from behavior |

Record counts and uncertainty. A small pilot should report individual task outcomes and qualitative failure patterns, not manufacture statistically significant growth claims. Analyze sequence/learning effects, document complexity and subject familiarity.

## Instrumentation without silent tracking

The current app has a local action history and explicit exports; it does not send telemetry. In a consented pilot, record task timing externally and use volunteered workspace exports to reconstruct source revisions and review decisions. Exported files contain source content, so keep them out of the public repository.

## Stop or change direction if

- Most target users rarely revisit outputs after source changes.
- Linking evidence costs more than manual checking across realistic revision cycles.
- People interpret a freshness state as a guarantee of factual correctness.
- Context alerts become noise and users routinely dismiss them without inspection.
- An existing native workflow meets the need with less effort.

## Follow-up experiments

Only after demonstrating usefulness: compare evidence-link suggestions, selective ingestion of Drive exports, or a semantic model that prioritizes context changes. Human-reviewed labels must remain independent of model predictions. Measure different language and document types separately; English text performance should not be generalized to equations, tables or multilingual notes.
