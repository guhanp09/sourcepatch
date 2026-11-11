# Two-minute product demonstration

Use the public demo or run `npm run dev`. The initial workspace is fictional and should be introduced as such.

**0:00–0:20 — User problem.** “A generated note can stay unchanged after its sources are revised. Google's documentation explicitly describes this behavior. SourcePatch helps a person maintain the exported note.”

**0:20–0:50 — Direct change.** Select the participant-count passage. The original evidence says 60, the current source says 80. Change the note to 80 total and 40 per group. Explain the evidence link, check the human-review confirmation and save.

**0:50–1:15 — Non-obvious case.** Select the random-assignment passage. Its citation still exists, but the source gained a limitation about generalizing results. Open the full context diff. Explain why exact-quote survival cannot establish that a claim remains valid.

**1:15–1:35 — Control and portability.** Open Review history to show the before/after text and snapshot. Open Outputs and export the guide. Unreviewed passages remain labeled. Mention local browser storage and backups.

**1:35–2:00 — Evidence and next decision.** Open Why this exists. Describe the 26 authored regression cases and the comparative research plan. State that no user-time savings or adoption has been measured. The next decision is whether setup plus maintenance effort beats manual checking.

For a technical audience, continue with `src/core/engine.ts`, the Gemini boundary tests and the source-version invalidation test. For a product audience, continue with the alternative solutions and the stop criteria in the research plan.
