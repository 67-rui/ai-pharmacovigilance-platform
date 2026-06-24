# Improvement Roadmap

This roadmap turns the current FAERS dashboard into a stronger portfolio project for AI, pharmacy, pharmacovigilance, and data product roles.

## Product North Star

Build a reviewer-ready AI pharmacovigilance workspace that helps users move from a drug name to adverse event patterns, safety signal triage, evidence-aware summaries, and exportable reports.

The project should demonstrate:

- Real-world public health data integration.
- Pharmacovigilance analytics beyond simple charting.
- AI-generated summaries with explicit limitations and source grounding.
- Multimodal medication intake that turns label evidence into confirmed FAERS queries.
- A usable dashboard that looks like an internal drug safety tool.
- Engineering maturity: tests, persistence, deployment, documentation, and reproducible examples.

## Stage 0: MVP Stabilization

Status: in progress.

Goal: Make the current dashboard reliable, explainable, and easy to demo.

Scope:

- Keep openFDA FAERS aggregate query latency under 5 seconds for common drugs.
- Done: Show the exact query assumptions used for suspect-drug matching.
- Replace ambiguous labels with pharmacovigilance-friendly language.
- Add empty, loading, and API error states for every chart panel.
- Add curated demo drugs with known high-volume FAERS coverage.
- Add a short product walkthrough to the README.

Acceptance criteria:

- `npm run lint` passes.
- `npm run build` passes.
- `metformin`, `atorvastatin`, `ibuprofen`, and `warfarin` all return usable dashboards.
- The app clearly states that FAERS cannot prove incidence or causality.

Resume value:

Shows a working AI data product rather than a prototype screenshot.

## Stage 1: Pharmacovigilance Analytics

Status: in progress.

Goal: Add real signal detection concepts that make the project credible for drug safety roles.

Priority backlog:

- Done: Add disproportionality metrics: PRR and ROR.
- Done: Add 2x2 contingency table display for selected drug-event pairs.
- Done: Add confidence interval calculations for ROR.
- Done: Add event search so reviewers can select a MedDRA preferred term.
- Done: Add drug-vs-drug comparison for same-class or user-selected drugs.
- Done: Add a basic signal ranking table across top reactions using report volume, PRR, and ROR.
- Done: Add a full reviewer workflow action that triggers signal metrics, ranking, comparison, and structured report generation from the current FAERS analysis.
- Done: Add filters for interpretation class, report frequency, PRR, and ROR in the ranking table.

Acceptance criteria:

- Users can select a drug and event, then see report counts for drug-event, drug-other-events, other-drugs-event, and other-drugs-other-events.
- Users can run the main reviewer workflow from a loaded FAERS analysis without clicking each advanced panel individually.
- Users can filter ranked signal candidates by interpretation class, report count, PRR, and ROR.
- The UI explains that disproportionality suggests reporting signal strength, not causal risk.
- At least one curated example demonstrates a meaningful signal interpretation.

Resume value:

Demonstrates domain-specific analytics instead of generic dashboard work.

## Stage 2: AI Report Quality

Status: in progress.

Goal: Turn the AI summary into a more trustworthy reviewer artifact.

Priority backlog:

- Done: Add structured report sections: Signal Overview, Key Patterns, Reviewer Follow-up, Limitations.
- Done: Add JSON schema validation for report inputs and outputs.
- Done: Add prompt versioning in `docs/prompts/`.
- Done: Add report quality checklist: no causal claims, no incidence claims, mentions FAERS limitations, includes reviewer next steps.
- Done: Add side-by-side raw statistics and AI narrative.
- Done: Add report tone modes: pharmacist review, regulatory briefing, portfolio summary.

Acceptance criteria:

- Reports remain useful without `OPENAI_API_KEY` through local template mode.
- Reports generated with OpenAI include the same required safety boundaries.
- Users can choose pharmacist review, regulatory briefing, or portfolio summary tone without changing the validated report schema.
- The README includes a sample report excerpt.

Resume value:

Shows responsible AI use in a regulated healthcare-adjacent context.

## Stage 2.5: Medication Image Intake

Status: in progress.

Goal: Add a portfolio-ready multimodal intake path from medication label evidence to confirmed FAERS analysis.

Priority backlog:

- Done: Add medication label image preview and OCR/label text intake UI.
- Done: Add browser-side OCR with editable extracted text before DeepSeek extraction.
- Done: Add DeepSeek API-backed medication field extraction.
- Done: Add deterministic local fallback when `DEEPSEEK_API_KEY` is missing or the provider fails.
- Done: Add zod schema validation for extracted medication candidates, active ingredients, strengths, safety keywords, and limitations.
- Done: Require human confirmation before routing extracted candidates into FAERS analysis.
- Done: Trigger the full reviewer workflow after confirming a medication-label candidate.
- Done: Expose provider mode, prompt version, fallback warnings, schema validation status, and extraction limitations in the intake UI.
- Done: Add saved intake evidence records with image metadata and confirmed drug name.
- P1: Add a dedicated OCR provider option for low-quality images.

Acceptance criteria:

- Users can upload a medication label image, run browser OCR or edit label text manually, extract structured fields, and confirm a drug candidate to run FAERS analysis, signal metrics, ranking, comparison, and structured report generation.
- Confirmed intake candidates are stored locally with image metadata, provider mode, confidence, extracted fields, and limitations for reviewer traceability.
- The app does not claim direct clinical decision support or autonomous medication identification.
- Intake remains usable without DeepSeek through deterministic fallback.

Resume value:

Demonstrates API-backed multimodal AI workflow design, schema validation, human-in-the-loop review, and pharmacovigilance system integration.

## Stage 3: Persistence And Export

Goal: Make the tool feel like a real workflow product.

Priority backlog:

- P0: Save analysis history locally with SQLite or a lightweight JSON store.
- Done: Add saved reports list with timestamp, drug, top reaction, total reports, prompt version, and reopen links.
- Done: Add CSV export for chart data and signal tables.
- Done: Add shareable analysis URLs with query parameters.
- P1: Add PDF report export.
- P2: Add project-level cache invalidation by openFDA `last_updated`.

Acceptance criteria:

- A user can run an analysis, generate a report, leave the page, and reopen the saved report.
- Recent generated reports appear in a local browser history panel with reproducible workflow links.
- A user can share a `?drug=` URL for a reproducible analysis or a `?workflow=full` URL for the full reviewer pass.
- A PDF or Markdown report can be attached to a portfolio, GitHub release, or interview deck.

Resume value:

Demonstrates product completeness and workflow thinking.

## Stage 4: Trust, Testing, And Reproducibility

Status: in progress.

Goal: Make the project defensible in interviews and code review.

Priority backlog:

- Done: Add unit tests for openFDA query builders and PRR/ROR calculations.
- Done: Add API route tests with mocked openFDA responses.
- P1: Add Playwright smoke tests for dashboard loading and report generation.
- P1: Add test fixtures for at least four drugs.
- P1: Add error handling tests for no-result drugs and rate-limit responses.
- P2: Add observability notes for API latency and failure rates.

Acceptance criteria:

- Tests can run locally without real openFDA calls.
- The FAERS analysis route is covered for validation errors, mocked aggregate success responses, and upstream openFDA failure handling.
- The README explains which tests are mocked and which are live integration checks.

Resume value:

Signals engineering quality, not just AI enthusiasm.

## Stage 5: Portfolio Packaging And Deployment

Goal: Make the project easy for recruiters and interviewers to understand in under two minutes.

Priority backlog:

- P0: Deploy a public demo with safe rate limits.
- P1: Add a short demo video or GIF.
- Done: Add a concise architecture diagram in `README.md`.
- Done: Add refreshed README product screenshots and `npm run screenshots`.
- Done: Add deployment-ready environment documentation in `docs/deployment.md`.
- Done: Add browser-side PDF report export.
- Done: Add a technical case study page in `docs/case-study.md`.
- Done: Add resume bullets and interview talking points in `docs/resume-interview-guide.md`.
- P2: Add GitHub issues for each roadmap item.

Acceptance criteria:

- The GitHub repository has a polished README, screenshots, live demo link, and clear limitations.
- The project can be explained as a full-stack AI pharmacovigilance system in one paragraph.

Resume value:

Turns the implementation into a strong public proof-of-work asset.

## Suggested Two-Week Sprint Plan

Sprint 1:

- Finish Stage 0.
- Add source query panel.
- Add curated examples and README walkthrough.

Sprint 2:

- Implement PRR/ROR calculation.
- Add event selector and signal table.
- Add tests for signal math.

Sprint 3:

- Improve AI report structure.
- Add report quality checklist.
- Add sample report to docs.

Sprint 4:

- Add saved report history.
- Add Markdown, CSV, and PDF export path.
- Add deployment-ready configuration.

Sprint 5:

- Add screenshots, case study, architecture diagram, and final resume bullets.

## Definition Of Done

Each meaningful feature should include:

- User-facing UI or API behavior.
- Clear pharmacovigilance interpretation boundary.
- Loading, empty, and error states when applicable.
- Tests when logic is non-trivial.
- README or docs update when the feature affects product story.
- A short note on how the feature strengthens the resume narrative.

## Current Top 5 Next Actions

1. Done: Add a source query panel that displays exact openFDA request assumptions.
2. Done: Add PRR/ROR signal metrics for selected drug-event pairs.
3. Done: Add tests for query building and signal calculations.
4. Done: Add event search for custom MedDRA preferred terms.
5. Done: Add report quality checklist and prompt versioning.

## Next Top 5 Actions

1. Done: Add JSON schema validation for report responses.
2. Done: Add drug-vs-drug comparison for user-selected products.
3. Done: Add CSV export for chart data and signal tables.
4. Done: Add README walkthrough with screenshots.
5. Done: Add API route tests with mocked openFDA responses.

## Following Actions

1. Deploy a public demo with safe rate limits.
2. Add a dedicated OCR provider option for low-quality images.
3. Add GitHub issues for remaining roadmap items.
4. Add a short demo video or GIF.
5. Done: Add Playwright smoke tests for dashboard loading and report generation.
