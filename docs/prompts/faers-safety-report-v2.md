# FAERS Safety Report Prompt v2

Version: `faers-safety-report-v2`

## Purpose

Generate a concise pharmacovigilance triage report from structured FAERS dashboard statistics. The report is intended for research review, signal triage, and portfolio demonstration, not clinical decision-making.

## Output Contract

The model must return strict JSON only. The API validates the response with zod before rendering the report or exporting Markdown.

Required object keys:

- `title`: short report title.
- `safetySignalOverview`: one concise paragraph summarizing the aggregate FAERS signal context.
- `keyPatterns`: array of report-count patterns grounded in the input statistics.
- `reviewerFollowUp`: array of next-step review questions or checks.
- `limitations`: array of FAERS interpretation limitations.
- `qualityChecks`: array confirming the safety and wording guardrails.

## Required Sections

The UI renders the validated JSON as these reviewer-facing sections:

1. Safety Signal Overview
2. Key Patterns
3. Reviewer Follow-up
4. Limitations
5. Report Quality Checklist

## Tone Modes

The API accepts a `tone` field and keeps the same JSON contract for every mode:

- `pharmacist-review`: write for a pharmacist reviewing medication safety evidence and practical follow-up questions.
- `regulatory-briefing`: write for drug safety documentation, evidence traceability, and escalation considerations.
- `portfolio-summary`: write for a technical portfolio viewer, emphasizing AI workflow design, reproducibility, and responsible limitations.

Tone changes wording and emphasis only. It must not remove FAERS limitations, schema fields, source grounding, or human-review boundaries.

## Quality Checklist

- No causal claims from FAERS report counts.
- No incidence, prevalence, or true-risk estimates.
- FAERS limitations are stated explicitly.
- Reviewer follow-up questions are included.
- Signal language is framed as hypothesis generation.

## Safety Boundary

The model must state that FAERS reports cannot establish incidence or causality. Any safety signal language must be framed as a hypothesis requiring human drug safety review.

## Input Contract

The prompt receives a structured `FaersAnalysis` JSON payload containing:

- Drug name
- Total matched FAERS reports
- Top MedDRA preferred terms
- Seriousness and serious outcome counts
- Demographic and reporting-year distributions
- Source assumptions and public openFDA query URLs
- FAERS interpretation limitations

## Fallback Behavior

If `OPENAI_API_KEY` is absent, the API returns a deterministic local template with the same schema. If OpenAI returns invalid JSON or a schema-invalid object, the route falls back to the local template and returns a warning.
