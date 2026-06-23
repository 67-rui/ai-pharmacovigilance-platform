# Improvement Roadmap

This roadmap turns the current FAERS dashboard into a stronger portfolio project for AI, pharmacy, pharmacovigilance, and data product roles.

## Product North Star

Build a reviewer-ready AI pharmacovigilance workspace that helps users move from a drug name to adverse event patterns, safety signal triage, evidence-aware summaries, and exportable reports.

The project should demonstrate:

- Real-world public health data integration.
- Pharmacovigilance analytics beyond simple charting.
- AI-generated summaries with explicit limitations and source grounding.
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
- P2: Add a basic signal ranking table with filters for seriousness, frequency, PRR, and ROR.

Acceptance criteria:

- Users can select a drug and event, then see report counts for drug-event, drug-other-events, other-drugs-event, and other-drugs-other-events.
- The UI explains that disproportionality suggests reporting signal strength, not causal risk.
- At least one curated example demonstrates a meaningful signal interpretation.

Resume value:

Demonstrates domain-specific analytics instead of generic dashboard work.

## Stage 2: AI Report Quality

Status: in progress.

Goal: Turn the AI summary into a more trustworthy reviewer artifact.

Priority backlog:

- Done: Add structured report sections: Signal Overview, Key Patterns, Reviewer Follow-up, Limitations.
- P0: Add JSON schema validation for report inputs and outputs.
- Done: Add prompt versioning in `docs/prompts/`.
- Done: Add report quality checklist: no causal claims, no incidence claims, mentions FAERS limitations, includes reviewer next steps.
- P1: Add side-by-side raw statistics and AI narrative.
- P2: Add report tone modes: pharmacist review, regulatory briefing, portfolio summary.

Acceptance criteria:

- Reports remain useful without `OPENAI_API_KEY` through local template mode.
- Reports generated with OpenAI include the same required safety boundaries.
- The README includes a sample report excerpt.

Resume value:

Shows responsible AI use in a regulated healthcare-adjacent context.

## Stage 3: Persistence And Export

Goal: Make the tool feel like a real workflow product.

Priority backlog:

- P0: Save analysis history locally with SQLite or a lightweight JSON store.
- P0: Add saved reports list with timestamp, drug, top reaction, and total reports.
- Done: Add CSV export for chart data and signal tables.
- P1: Add PDF report export.
- P1: Add shareable analysis URLs with query parameters.
- P2: Add project-level cache invalidation by openFDA `last_updated`.

Acceptance criteria:

- A user can run an analysis, generate a report, leave the page, and reopen the saved report.
- A PDF or Markdown report can be attached to a portfolio, GitHub release, or interview deck.

Resume value:

Demonstrates product completeness and workflow thinking.

## Stage 4: Trust, Testing, And Reproducibility

Status: in progress.

Goal: Make the project defensible in interviews and code review.

Priority backlog:

- Done: Add unit tests for openFDA query builders and PRR/ROR calculations.
- P0: Add API route tests with mocked openFDA responses.
- P1: Add Playwright smoke tests for dashboard loading and report generation.
- P1: Add test fixtures for at least four drugs.
- P1: Add error handling tests for no-result drugs and rate-limit responses.
- P2: Add observability notes for API latency and failure rates.

Acceptance criteria:

- Tests can run locally without real openFDA calls.
- The README explains which tests are mocked and which are live integration checks.

Resume value:

Signals engineering quality, not just AI enthusiasm.

## Stage 5: Portfolio Packaging And Deployment

Goal: Make the project easy for recruiters and interviewers to understand in under two minutes.

Priority backlog:

- P0: Add screenshots to README.
- P0: Add a concise architecture diagram.
- P0: Deploy a public demo with safe rate limits.
- P1: Add a short demo video or GIF.
- P1: Add a technical case study page in `docs/case-study.md`.
- P1: Add resume bullets and interview talking points.
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

1. Add JSON schema validation for report responses.
2. Done: Add drug-vs-drug comparison for user-selected products.
3. Done: Add CSV export for chart data and signal tables.
4. Add README walkthrough with screenshots.
5. Add API route tests with mocked openFDA responses.

## Following Actions

1. Add PDF report export.
2. Add saved report history.
3. Add a signal ranking table across top reactions.
4. Add deployment-ready environment documentation.
5. Add a case study page for portfolio storytelling.
