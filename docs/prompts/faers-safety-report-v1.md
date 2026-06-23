# FAERS Safety Report Prompt v1

Version: `faers-safety-report-v1`

## Purpose

Generate a concise pharmacovigilance triage report from structured FAERS dashboard statistics. The report is intended for research review, not clinical decision-making.

## Required Sections

1. Safety Signal Overview
2. Key Patterns
3. Reviewer Follow-up
4. Limitations

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
