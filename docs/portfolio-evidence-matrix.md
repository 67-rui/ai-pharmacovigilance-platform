# Portfolio Evidence Matrix

This matrix maps the portfolio goal to concrete product behavior, code paths, tests, and reviewer artifacts. Use it as a quick verification guide before interviews, demos, or deployment.

## Goal Coverage

| Goal requirement | Current evidence | Verification status |
| --- | --- | --- |
| Start from a drug name | `/?drug=metformin` shareable URL support and the FAERS search form in `PharmacovigilanceDashboard.tsx`. | Verified locally by mocked Playwright workflow and unit tests. |
| Start from medication-label evidence | Browser OCR/editable label text, `/api/intake/medication`, DeepSeek-compatible extraction, deterministic fallback, and confirmed evidence history. | Verified locally by `tests/e2e/dashboard.spec.ts` label-evidence path and intake route tests. |
| Query FAERS data | `/api/faers` calls openFDA aggregate endpoints and returns source provenance, chart-ready aggregates, and freshness metadata. | Verified by mocked API route tests and deployment readiness checks; live public URL still pending. |
| Run signal analysis | `/api/signal` and `src/lib/signal.ts` compute PRR, ROR, ROR confidence interval, interpretation labels, and 2x2 counts. | Verified by Vitest signal tests. |
| Rank candidate events | `/api/rankings` and `src/lib/ranking.ts` rank MedDRA preferred terms by interpretation, report count, PRR, and ROR with filters. | Verified by ranking unit tests and route tests. |
| Compare drugs | `/api/compare` and `src/lib/comparison.ts` compare event reporting share per 1,000 suspect-drug reports. | Verified by comparison tests and full-workflow smoke coverage. |
| Generate AI structured report | `/api/report` supports OpenAI-compatible generation and deterministic template fallback with the same report schema. | Verified by report route tests and Playwright report rendering checks. |
| Enforce schema validation | `src/lib/report.ts` and `src/lib/medicationIntake.ts` validate structured AI outputs with zod before rendering. | Verified by report and medication-intake schema tests. |
| Require human confirmation | Medication intake cannot launch FAERS analysis until a candidate is explicitly confirmed. | Verified by Playwright test for label-evidence confirmation. |
| Show safety boundaries | README, UI copy, reports, exports, and sample report state FAERS no-causality/no-incidence limitations. | Verified in docs, sample report, report tests, and generated report quality checklist. |
| Export reviewer artifacts | Markdown, PDF, and CSV export paths support attaching outputs to portfolio materials. | Verified by PDF report tests and e2e report export control checks. |
| Package as portfolio proof | README screenshots, demo video, case study, sample report, resume guide, deployment guide, and this matrix. | Verified in repository docs; public live demo link still pending. |

## High-Value Files

| Area | Files |
| --- | --- |
| Dashboard UI | `apps/web/src/components/PharmacovigilanceDashboard.tsx` |
| FAERS queries | `apps/web/src/lib/openfda.ts`, `apps/web/src/app/api/faers/route.ts` |
| Signal analytics | `apps/web/src/lib/signal.ts`, `apps/web/src/app/api/signal/route.ts` |
| Signal ranking | `apps/web/src/lib/ranking.ts`, `apps/web/src/app/api/rankings/route.ts` |
| Drug comparison | `apps/web/src/lib/comparison.ts`, `apps/web/src/app/api/compare/route.ts` |
| Medication intake | `apps/web/src/lib/medicationIntake.ts`, `apps/web/src/lib/ocrQuality.ts`, `apps/web/src/app/api/intake/medication/route.ts` |
| Structured reports | `apps/web/src/lib/report.ts`, `apps/web/src/app/api/report/route.ts`, `docs/prompts/faers-safety-report-v2.md` |
| Human-in-loop history | `apps/web/src/lib/intakeEvidenceHistory.ts`, `apps/web/src/lib/analysisHistory.ts`, `apps/web/src/lib/reportHistory.ts` |
| Deployment safety | `vercel.json`, `scripts/check-deployment-readiness.mjs`, `scripts/smoke-test-live-demo.mjs`, `docs/deployment.md` |

## Interview Demo Script

1. Open `/?drug=metformin&workflow=full`.
2. Point out FAERS source provenance and explain why aggregate queries are used.
3. Open the signal panel and explain the 2x2 table, PRR, ROR, and ROR confidence interval.
4. Show the signal ranking filters and drug comparison table.
5. Open the AI report and point out prompt version, schema validation, quality checks, and FAERS limitations.
6. Paste medication-label text, run intake, and emphasize that FAERS analysis starts only after candidate confirmation.
7. Export the Markdown or PDF report as the reviewer artifact.

## Completion Status

Local implementation and verification are complete for the core portfolio workflow. Public portfolio completion still requires:

1. Deploy to Vercel or another host that supports Next.js App Router API routes.
2. Run `DEMO_URL=https://your-project.vercel.app npm run smoke:demo`.
3. Add the live demo URL to `README.md`, `docs/deployment.md`, and the GitHub repository homepage.
4. Close GitHub issue #1 after the deployed smoke test passes.
