# Google APM project shortlist

Prepared for Guhan Purushothaman · Research checked 12 November 2026

## Decision

**Build SourcePatch: freshness review for exported NotebookLM outputs.** It addresses an explicitly documented Google product limitation, can work without private Google infrastructure, and makes a complete product decision visible: which passages deserve review, what evidence changed, and when a person can safely approve a correction. It also fits a mathematics student who creates learning material.

The ranking below is a reasoned selection, not a claim about Google's confidential hiring rubric or a promise of recruiter interest. Documentation establishes product behavior; the proposed solutions and their commercial value remain hypotheses to test. A working prototype and reproducible evaluation can be completed independently. Customer adoption, retention, time saved and causal business impact require actual users and must not be invented.

## What the role actually asks for

The [Bengaluru Associate Product Manager, University Graduate, 2027 posting](https://www.google.com/about/careers/applications/jobs/results/101007950268506822-associate-product-manager-university-graduate-2027-start) emphasizes understanding users and markets, launching features, testing performance, iteration, and working with engineering, UX, marketing and legal. Preferred experience includes applied AI/ML, programming, analysis, business modeling or design. Entrepreneurship, technical presentations and cross-functional relationships also appear in the qualifications.

Consequently, the portfolio should expose the problem selection, research, scope, design, implementation, evaluation, tradeoffs and launch decision. Code alone would leave much of that evidence invisible. An independent project cannot establish that someone has worked on a Google team or collaborated with actual Google functions.

An official, historical [Google interview with former APM Jeff Chang](https://students.googleblog.com/2011/03/young-innovators-google-jeff-chang.html) describes work on Gmail infrastructure and then identifying an enterprise opportunity for Google Groups, prioritizing features, securing organizational support and launching with beta customers. This is an example of the product lifecycle, not evidence that all APM assignments have that scope today. A [2026 interview with YouTube's auto-dubbing PM](https://blog.youtube/creator-and-artist-stories/youtube-auto-dubbing-explained/) discusses language coverage, quality, creator control and language-level performance, illustrating current product tradeoffs.

Google researchers' [HEART / goals-signals-metrics work](https://research.google/pubs/measuring-the-user-experience-on-a-large-scale-user-centered-metrics-for-web-applications/) supplies a useful measurement approach: derive observable signals and metrics from a user goal. It does not make an unmeasured portfolio project successful by association.

## Ranked options

| Rank | Project | Product connection | Primary value hypothesis | Main validation dependency |
| --- | --- | --- | --- | --- |
| 1 | SourcePatch | NotebookLM / Gemini Notebook | Prevent old generated passages being reused after evidence changes | Test review usefulness with people maintaining notes |
| 2 | DubCheck | YouTube automatic dubbing | Catch consequential meaning changes before publication | Access to creator-owned dubs and bilingual reviewers |
| 3 | Drive Access Preview | Google Drive | Explain who retains access after a sharing change | Representative permission graphs and authorized group visibility |
| 4 | Access Arrival | Google Maps | Make the final accessible approach verifiable and current | Disability-led field research and ongoing data maintenance |
| 5 | Forms Field Kit | Google Forms + Sheets | Preserve field submissions through connectivity loss and schema changes | Pilot with field teams; compare established offline tools |

### 1. SourcePatch — freshness review for NotebookLM outputs

**Documented issue.** Google's [source documentation](https://support.google.com/gemininotebook/answer/16215270?hl=en) distinguishes updated sources from previously generated Studio outputs: updating or deleting a source does not change those outputs. The same documentation now describes automatic updates for imported Drive sources. The opportunity is therefore downstream review of old outputs, rather than adding source synchronization that already exists. Google currently labels this help center Gemini Notebook; NotebookLM remains the familiar product name used in this proposal.

**Proposed product.** Import a source snapshot and an exported text output, confirm the evidence behind individual passages, then compare a revised source. Prioritize passages whose evidence changed, keep additional context changes visible, and support an explicit review decision with a versioned audit trail. Export the corrected note with its provenance. Start with study guides and research briefs; avoid promising universal factual verification.

**Buildable scope.** A browser app using local storage, Markdown/text files, exact evidence anchors and deterministic change detection. Suggested citation matches assist initial setup but remain unconfirmed until reviewed. An optional Gemini command-line reviewer can propose edits; it cannot approve them. No consumer NotebookLM API, account scraping, automatic Drive synchronization or native Google feature modification is assumed.

**Measurement.** Reproducible, labeled source-revision fixtures test missed review needs, unnecessary alerts, unresolved citations and review invalidation. Compare against leaving outputs unchanged, blanket invalidation, and checking only a cited excerpt. A later counterbalanced user study should measure erroneous passages remaining after review and completion time; a small usability pilot cannot establish retention or population-level impact.

**APM decisions demonstrated.** User segmentation; AI reliability; provenance UX; prioritization under uncertainty; review burden versus missed errors; privacy defaults; delivery and instrumentation. Core product decision: evidence can remain unchanged while new context invalidates its interpretation, so the product must not equate a surviving quote with a verified claim.

**Why first.** Strong primary evidence, an immediately usable independent workflow, manageable integration constraints, and an auditable evaluation. It is a stronger autonomous build choice than a project whose value cannot be tested without private data or field recruitment. The cost of manually establishing evidence links remains a genuine adoption risk to study.

### 2. DubCheck — meaning-preserving review for YouTube dubs

**Documented issue.** [YouTube Help](https://support.google.com/youtube/answer/15569972?hl=en) acknowledges errors involving speech recognition, dialects, proper nouns, idioms and jargon. Manual review and transcript inspection already exist, and automatic dubs cannot currently be edited directly. The [2026 PM interview](https://blog.youtube/creator-and-artist-stories/youtube-auto-dubbing-explained/) also describes audio-track analytics and continued work on creator tools. A basic dubbing tool, approval screen or language dashboard would duplicate existing capabilities.

**Proposed product.** Help educational creators inspect high-consequence differences: changed quantities, units, negation, named entities and domain terminology. Present synchronized source and target passages, explain each flag, and export a human-reviewed correction package for the creator's own production workflow. Start with English, Tamil and Hindi educational material.

**Buildable scope.** Creator-supplied audio/transcripts and a bilingual review UI. Any authorized platform integration must be checked separately; do not assume an API can retrieve or overwrite YouTube's automatic dub tracks. The product should prioritize human review rather than make unsupported claims that back-translation proves accuracy.

**Measurement.** Bilingual reviewers annotate critical errors in held-out clips. Compare missed critical errors and review minutes per ten minutes of video against existing manual review. Track false alarms, dialect-specific failures and viewer comprehension separately. Watch time alone is not proof of translation correctness.

**APM overlap and potential impact.** Creator discovery, internationalization, AI evaluation, quality-cost tradeoffs and release criteria. It matches Guhan's educational content experience particularly well. It ranks second because a persuasive evaluation needs independent bilingual judgments and access to actual creator-owned dubbing material.

### 3. Drive Access Preview — explain access before a folder change

**Documented issue.** Google's [limited-access guidance](https://support.google.com/drive/answer/14254362?hl=en) explains that a person listed under removed access can still have access through a permitted group or general access. Google's [shared-drive guidance](https://support.google.com/a/users/answer/12380484?hl=en) also describes changes in inherited versus direct permissions when files move. Native sharing controls, limited-access folders and administrative tools already exist.

**Proposed product.** Preview a scoped move or sharing change across several files: who gains, loses or retains access, the path that grants it, and what cannot be determined. Show a clear comparison of alternative changes before anything is applied.

**Buildable scope.** Read-only simulation on selected files using permission metadata and a controlled test workspace. The [Drive sharing API guide](https://developers.google.com/workspace/drive/api/guides/manage-sharing) describes permission data. Hidden group membership must be marked unknown; a normal user token cannot justify an enterprise-wide visibility claim. Start with an explicit subset of permission configurations.

**Measurement.** Compare participants' access predictions and successful completion of offboarding or folder-move tasks with native Share dialogs. Record incorrect access assurances, unintended loss of access and time to complete. Do not equate an attractive graph with verified security.

**APM overlap and potential impact.** Enterprise workflow research, privacy UX, policy constraints, engineering dependencies, trust and adoption. High potential usefulness, with substantially greater integration and policy complexity than SourcePatch.

### 4. Access Arrival — verified final approaches for Google Maps

**Documented issue.** Google [already provides accessible walking directions](https://blog.google/company-news/outreach-and-initiatives/accessibility/making-daily-tasks-accessible/) and [place accessibility attributes](https://support.google.com/maps/answer/6396990?hl=en). The [National Centre for Accessible Transport's January 2025 research](https://www.ncat.uk/wp-content/uploads/2025/05/ncat-Understanding-and-addressing-the-gap-in-transport-accessibility-data-Insights-Report-PDF-FINAL48.pdf) documents unavailable, incorrect or incomplete accessibility information and resulting planning difficulties. This is UK research; it does not establish the prevalence of the same problems on an Indian campus.

**Proposed product.** A Maps-based companion showing a specific accessible entrance and the last approach: dated observations, surface and slope details, temporary obstructions, evidence photographs and explicit unknowns. Start with a small campus or neighborhood and co-design with wheelchair users.

**Buildable scope.** Google Maps presentation plus independently collected, permissioned route observations. Do not label a route safe based only on AI image inference or substitute a wheelchair simulation for actual participant involvement. The hard product problem is maintaining reliable information, not placing pins on a map.

**Measurement.** Agreement between published observations and field audits, failed approaches, information completeness, and participant confidence calibrated against actual route conditions. Maintenance effort per location matters to viability.

**APM overlap and potential impact.** Inclusive research, mapping data quality, partnerships, operational design and geographic rollout. Potentially high social value; unsuitable for claiming a complete validated product without community participation and fieldwork.

### 5. Forms Field Kit — reliable offline field collection

**Documented issue.** Google's [Forms autosave documentation](https://support.google.com/docs/answer/10952360?hl=en) says autosave does not work offline and explains how question deletion or branching changes can affect saved drafts. A field workflow therefore needs more than a superficial offline toggle.

**Proposed product.** An owner-authorized companion that caches a form, saves responses locally, displays pending versus received submissions, deduplicates retries and resolves changed questions when reconnecting. Target volunteers collecting non-sensitive event or facility feedback.

**Buildable scope.** A narrow set of question types with a synchronized response ledger. The [Forms REST response API](https://developers.google.com/workspace/forms/api/reference/rest/v1/forms.responses) exposes read methods; [Apps Script FormResponse](https://developers.google.com/apps-script/reference/forms/form-response) supports submission under authorization. These are different integration paths. Authenticated identity semantics and submit-trigger behavior need explicit testing, rather than treating a custom collector as identical to native Forms.

**Measurement.** Lost/duplicated responses under interrupted connections, time to recover, stale-schema errors and fieldworker completion. Compare with established offline collection alternatives before assuming users should adopt a new tool.

**APM overlap and potential impact.** Connectivity constraints, user journeys, data quality, reliability, prioritization and rollout. A real limitation with a practical build path, but a less distinctive portfolio choice unless a field partner validates unmet needs beyond existing alternatives.

## What would make the selected project credible

1. A working import → source revision → passage review → export journey, using public APIs only where actually supported.
2. A concise product requirements document, explicit alternatives and recorded scope decisions.
3. An evaluation with public fixtures, baselines and limitations; no fabricated interview quotes or usage metrics.
4. Accessible interaction and tests for corrupted imports, storage failure, unresolved provenance and subsequent revisions.
5. A technical presentation/demo and a case study that separates shipped behavior from proposed future research.
6. Honest disclosure of AI-assisted development and which parts of the evaluation were automated.

## Selection constraints and next evidence

SourcePatch will initially support exported text/Markdown, not native NotebookLM modification or automatic audio/video regeneration. Meaning preservation still needs human judgment. The first real-world go/no-go question is whether maintaining citation links costs less than the review burden it removes. A failed test on that question should change the product, not be hidden in the résumé.

The current APM posting states an application deadline of 24 November 2026. A finished independent prototype can be documented before then; long-term adoption or retention cannot honestly be manufactured to fit that deadline.
