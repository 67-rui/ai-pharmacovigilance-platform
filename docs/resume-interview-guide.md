# Resume And Interview Guide

This guide turns the AI Pharmacovigilance Workspace into resume-ready language and interview-ready talking points.

## One-Line Pitch

Built an AI pharmacovigilance workspace that turns a drug name or medication-label evidence into FAERS signal triage, PRR/ROR analytics, drug comparison, and schema-validated AI safety reports with human-in-the-loop review.

## Resume Bullets

### AI / ML Engineering

- Built an AI-assisted pharmacovigilance workflow that combines enhanced OCR medication-label intake, OCR quality scoring, optional DeepSeek extraction, openFDA FAERS querying, PRR/ROR signal metrics, and schema-validated OpenAI/template safety reports.
- Designed responsible-AI guardrails for a healthcare-adjacent product, including zod schema validation, prompt versioning, fallback modes, human confirmation before analysis, and explicit FAERS no-causality/no-incidence limitations.
- Implemented a reproducible full reviewer workflow that automatically runs FAERS analysis, signal ranking, drug-vs-drug comparison, and structured report generation from a drug name or confirmed label candidate.

### Pharmacy / Biotech / Drug Safety

- Developed a pharmacovigilance dashboard for post-market adverse-event signal triage using openFDA FAERS aggregate queries, MedDRA preferred terms, PRR/ROR disproportionality metrics, and reviewer-facing safety limitations.
- Built a label-to-FAERS intake flow that extracts candidate medications from OCR text, requires human confirmation, and routes confirmed drug candidates into signal analysis and structured safety reporting.
- Created exportable Markdown/PDF safety reports that preserve source provenance, signal interpretation boundaries, quality checks, and follow-up questions for drug safety review.

### Full-Stack / Data Product

- Delivered a Next.js full-stack data product with App Router API routes, live openFDA integration, browser-side OCR, local fallback AI modes, local history persistence, CSV/Markdown/PDF exports, and shareable full-workflow URLs.
- Added engineering quality gates with Vitest unit tests for query builders, signal math, report schemas, intake parsing, history logic, and a Playwright smoke test for the shareable full-workflow demo path.
- Documented deployment, environment variables, deterministic screenshots, architecture, limitations, and interview framing so the project can be reviewed quickly as a public portfolio artifact.

## Short Resume Version

Built an AI-powered pharmacovigilance workspace using Next.js, openFDA FAERS, OCR, DeepSeek-compatible extraction, and schema-validated OpenAI/template reports to support adverse-event signal triage, PRR/ROR analysis, drug comparison, and exportable reviewer reports with responsible-AI guardrails.

## Interview Walkthrough

### 30-Second Version

I built a portfolio-grade pharmacovigilance workspace. A reviewer can enter a drug name or confirm a drug extracted from medication-label evidence. The app queries openFDA FAERS, visualizes adverse-event patterns, computes PRR/ROR signal metrics, ranks candidate events, compares drugs by reporting share, and generates a schema-validated AI safety report. I focused on responsible AI by requiring human confirmation for label intake, exposing source provenance, validating structured outputs, and preserving FAERS limitations in the UI and exports.

### 2-Minute Version

The project is designed around a realistic drug-safety review workflow. The first input path is a drug search; the second input path is medication-label evidence. For labels, the browser runs OCR, the user can edit the extracted text, and the intake route uses either DeepSeek-compatible extraction or a deterministic fallback. The output is schema-validated and cannot trigger FAERS analysis until a human confirms the candidate drug.

After that, the dashboard uses openFDA FAERS aggregate count queries. It shows top MedDRA preferred terms, seriousness, outcomes, demographic distributions, and source query provenance. The advanced workflow computes PRR and ROR from a 2x2 table, ranks top reported events, compares a primary drug against a comparator by event reporting share, and generates a structured AI report.

The AI report route supports OpenAI when configured and template mode otherwise. Both paths return the same schema, prompt version, quality checklist, limitations, and Markdown/PDF exports. I also added Vitest coverage and a Playwright smoke test so the main shareable workflow is reproducible without live provider keys.

## Interview Talking Points

### Why This Project

- It shows AI use in a domain where hallucination and overclaiming matter.
- It is not just a chat UI; it combines public health data, signal metrics, source provenance, and structured report generation.
- It demonstrates awareness of pharmacovigilance limits: FAERS supports signal triage, not incidence, true risk, or causality.

### Architecture

- Frontend: Next.js dashboard with reviewer panels, browser OCR, local history, and export controls.
- Backend: App Router API routes for FAERS, signal metrics, rankings, drug comparison, medication intake, and report generation.
- Data source: openFDA Drug Adverse Event API using aggregate `count` queries instead of full case downloads.
- AI providers: optional DeepSeek-compatible medication intake and optional OpenAI report generation, both with deterministic fallback modes.
- Validation: zod schemas for AI outputs and typed domain models for analysis results.

### Responsible AI Decisions

- Medication-label extraction requires human confirmation before analysis.
- OCR text remains editable before model extraction.
- Provider failures fall back to deterministic output rather than breaking the demo.
- Reports include quality checks and explicit FAERS limitations.
- Source URLs and query assumptions are visible to support reproducibility.
- The UI avoids clinical advice, causality claims, and incidence estimates.

### Technical Tradeoffs

- Aggregate FAERS queries keep the dashboard responsive, but they do not support patient-level causality review.
- Browser-side Standard/Enhanced OCR avoids server-side file handling, but recognition quality still depends on image clarity and requires human review before analysis.
- Template fallback keeps the portfolio demo usable without paid AI keys, but live provider mode can produce richer narrative summaries.
- LocalStorage history is enough for a portfolio workflow, but a production system would need authenticated persistence and audit trails.

### Testing Story

- Unit tests cover query construction, four-drug FAERS fixtures, no-result and rate-limit error paths, signal math, signal ranking filters, structured report generation, medication intake parsing, API fallback behavior, and history helpers.
- Playwright smoke tests mock API responses and verify both the shareable full-workflow path `/?drug=metformin&workflow=full` and the label-evidence path from editable OCR text to human-confirmed workflow launch.
- Screenshot generation uses the same mocked-workflow style so README assets are deterministic and do not depend on live API drift.

## Likely Interview Questions

### How do you avoid AI hallucination?

The app does not let the model invent the data layer. FAERS analysis comes from structured openFDA query results. AI report responses are parsed into a zod schema before rendering, and the report includes quality checks and FAERS limitations. If a provider call fails or returns invalid shape, the app uses deterministic fallback output.

### Why use PRR and ROR?

PRR and ROR are common disproportionality-style metrics for signal triage. They are useful for prioritizing drug-event pairs for review, but they do not prove causality or estimate real-world incidence. The app exposes the underlying 2x2 table and labels the interpretation as a signal hypothesis.

### Why require human confirmation for medication intake?

OCR and model extraction can misread drug names, strengths, or context. In this workflow, label evidence can suggest candidate drugs, but the confirmed FAERS query only runs after the user selects a candidate. That keeps the AI assistive rather than autonomous.

### What would you improve next?

- Deploy a public demo with safe rate limits and no required paid AI keys.
- Add a stronger OCR provider for low-quality medication images.
- Add authenticated saved reviews and audit trails.
- Add broader Playwright coverage for export downloads and provider-error states.
- Add a concise demo video or GIF for recruiters.

## Portfolio Keywords

AI pharmacovigilance, FAERS, openFDA, adverse event reporting, drug safety, PRR, ROR, MedDRA, OCR, DeepSeek, OpenAI, structured outputs, schema validation, zod, human-in-the-loop, responsible AI, Next.js, TypeScript, Playwright, Vitest, data product, healthcare AI.
