# Project Plan

## Goal

Build a portfolio-ready AI Pharmacovigilance Workspace that turns a drug name or confirmed medication-label evidence into FAERS analysis, signal triage, drug comparison, and schema-validated AI safety reporting with explicit human-review boundaries.

## Current Product Scope

The workspace now covers the main reviewer journey:

1. Start from a typed drug name or medication-label evidence.
2. Run browser OCR, optional DeepSeek-compatible extraction, and deterministic fallback intake.
3. Require human confirmation before routing a medication candidate into FAERS.
4. Query openFDA FAERS aggregate endpoints with visible source provenance.
5. Display adverse event patterns, seriousness, outcomes, demographics, trends, and drug roles.
6. Compute PRR/ROR signal metrics with a 2x2 table and ROR confidence interval.
7. Rank candidate MedDRA preferred terms by signal interpretation and reporting metrics.
8. Compare two drugs by event reporting share per 1,000 suspect-drug reports.
9. Generate OpenAI-compatible or deterministic template reports with the same zod-validated schema.
10. Export Markdown, PDF, and CSV artifacts for portfolio review.

## Responsible AI Boundaries

- FAERS report counts are used for signal triage, not incidence, prevalence, true risk, or causality.
- Medication-label OCR and extraction are assistive only; a human must confirm the candidate drug before analysis.
- AI report output is schema-validated before rendering or export.
- Provider failures degrade to deterministic fallback modes that preserve the same report/intake contracts.
- Source provenance exposes query assumptions and openFDA request URLs without committing API keys.

## Evidence Artifacts

- [README.md](../README.md): product overview, screenshots, architecture, verification commands, and resume bullet.
- [case-study.md](case-study.md): portfolio narrative and system walkthrough.
- [portfolio-evidence-matrix.md](portfolio-evidence-matrix.md): requirement-to-evidence map for code, tests, docs, and remaining deployment proof.
- [sample-report.md](sample-report.md): static reviewer artifact for metformin.
- [resume-interview-guide.md](resume-interview-guide.md): role-specific resume bullets and interview answers.
- [deployment.md](deployment.md): Vercel setup, public-demo rate limits, smoke test, and safety notes.
- [roadmap.md](roadmap.md): detailed completed stages and remaining deployment work.

## Verification Gates

Run these before presenting or deploying the project:

```bash
npm run check:deploy
npm run test
npm run test:e2e
npm run lint
npm run build
```

After public deployment, run:

```bash
DEMO_URL=https://your-project.vercel.app npm run smoke:demo
```

## Remaining Portfolio Completion Work

The core local product is implemented and verified. The remaining public-facing milestone is deployment:

1. Deploy the repository to Vercel from `main`.
2. Keep OpenAI and DeepSeek keys optional so fallback modes remain demoable.
3. Prefer configuring `OPENFDA_API_KEY` for public rate-limit stability.
4. Run the live smoke test against the deployed URL.
5. Add the final live demo link to `README.md` and `docs/deployment.md`.
6. Close GitHub issue #1 after the live URL passes smoke testing.

## Resume Framing

Built an AI pharmacovigilance workspace using Next.js, openFDA FAERS, OCR, DeepSeek-compatible medication extraction, PRR/ROR signal analytics, drug-event comparison, and schema-validated OpenAI/template reports to demonstrate responsible AI in a healthcare-adjacent drug safety workflow.
