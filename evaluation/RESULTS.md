# Evaluation results

**Scope:** 26 hand-authored source-revision scenarios. This is a deterministic regression and policy comparison, not a production benchmark, held-out model evaluation, or user study. The fixture policy and implementation were developed together; perfect agreement cannot establish real-world accuracy.

Run `npm run evaluate` to reproduce this table. No network, API key, personal documents or paid services are used.

A positive label means a passage requires review. Context changes deliberately count as positive because a surviving quote can be qualified elsewhere. The same explicit unresolved-evidence policy is applied to the comparison strategies that inspect evidence.

| Strategy | Review needs found | Review needs missed | Unnecessary alerts | Precision | Recall | Total alerts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Leave output unchanged | 0 | 20 | 0 | n/a | 0.0% | 0 |
| Invalidate all on any source change | 20 | 0 | 2 | 90.9% | 100.0% | 22 |
| Check cited excerpt only | 14 | 6 | 0 | 100.0% | 70.0% | 14 |
| SourcePatch | 20 | 0 | 0 | 100.0% | 100.0% | 20 |

Full status agreement: **26/26** across changed evidence, changed context, unlinked evidence, missing source and unchanged source cases.

## Interpretation

- Exact-anchor checking misses changed surrounding context in these fixtures. This motivates a separate context-review category.
- Blanket invalidation surfaces unrelated changes too. SourcePatch uses explicit dependencies to avoid those alerts.
- SourcePatch still flags harmless edits elsewhere in a linked source. It does not claim semantic understanding or automatic fact verification.
- Similarity-based citation suggestions are never treated as verified, regardless of their score.
- This test set cannot measure review time, setup burden, adoption, comprehension, retention or translation quality.
- Optional Gemini suggestions are evaluated separately with mocked transport/validation tests. These figures are not Gemini quality measurements.

## Scenario-level results

| Case | Expected | Observed | Reason |
| --- | --- | --- | --- |
| quantity | changed | changed | A quantity in the cited evidence changes. |
| date | changed | changed | A scheduled date changes. |
| negation | changed | changed | Negation changes a statement even with high lexical overlap. |
| unit | changed | changed | The number is unchanged but its unit changes. |
| threshold | changed | changed | A numerical threshold changes. |
| inequality | changed | changed | A mathematical operator changes. |
| deleted-evidence | changed | changed | The supporting passage is removed. |
| scope-change | changed | changed | A qualification narrows the claim's scope. |
| punctuation | changed | changed | Punctuation carries mathematical meaning and cannot be normalized away. |
| code-indentation | changed | changed | Internal indentation is preserved because it can affect meaning. |
| new-exception | context | context | The quote survives but a new exception may invalidate its use. |
| new-limitation | context | context | A new limitation changes how unchanged evidence should be interpreted. |
| neighbor-changed | context | context | Changed neighboring content is conservatively surfaced for review. |
| source-reordered | context | context | Reordering is treated as context change, not assumed harmless. |
| heading-change | context | context | A changed heading may change interpretation or status. |
| footnote-added | context | context | A new measurement condition can qualify an unchanged claim. |
| unchanged | current | current | The linked source did not change. |
| line-endings | current | current | CRLF and LF line endings are equivalent in the text workflow. |
| unicode-canonical | current | current | Canonical Unicode encoding differences are normalized. |
| outer-space | current | current | Outer whitespace does not change this anchored text. |
| unrelated-source | current | current | An unrelated source revision should not invalidate this passage. |
| unrelated-schedule | current | current | An unrelated schedule revision should not invalidate a writing note. |
| unconfirmed-match | unlinked | unlinked | Even an exact suggested match requires human confirmation. |
| no-link | unlinked | unlinked | An unlinked claim is not marked current. |
| archived-source | missing | missing | Archived sources must not keep a passage silently current. |
| missing-source | missing | missing | A missing dependency is a blocking review condition. |

## Next validation

Freeze a separate set of real, permissioned document revisions before further tuning. Recruit independent reviewers to label meaning changes and relevant context. Run a counterbalanced comparison with manual checking, counting initial link setup and corrections as part of total effort. Report uncertainty and failures, including cases where extra alerts outweigh any benefit. See [the proposed study](../docs/RESEARCH_PLAN.md).
