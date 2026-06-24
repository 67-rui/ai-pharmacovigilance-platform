# Sample Pharmacovigilance Reviewer Report

This sample shows the kind of reviewer artifact produced by the AI Pharmacovigilance Workspace after a full mocked metformin workflow. It is designed for portfolio review and interview discussion. It is not medical advice, clinical decision support, or a regulatory conclusion.

## Workflow Context

| Field | Value |
| --- | --- |
| Primary drug | metformin |
| Input path | Medication-label text confirmed by a human reviewer |
| Confirmed label text | Metformin hydrochloride tablets 500 mg. Adverse reactions include nausea and diarrhea. Contraindications: severe renal impairment. |
| Intake provider mode | fallback sample output |
| Report mode | template sample output |
| Prompt version | faers-safety-report-v2 |
| Schema validated | yes |
| Generated for | Portfolio reviewer demonstration |

Human confirmation is required before medication-label evidence launches analysis. OCR and medication extraction can be incomplete or wrong, so the app keeps label text editable and requires the reviewer to confirm the drug candidate before FAERS querying, signal metrics, comparison, or report generation begins.

## Source Provenance

The workflow uses openFDA FAERS aggregate count endpoints rather than downloading patient-level case reports.

| Query area | Sample value |
| --- | --- |
| Source | openFDA FAERS Drug Event API |
| Endpoint | `https://api.fda.gov/drug/event.json` |
| Drug search assumption | Suspect-drug matching across medicinal product and openFDA generic/brand names |
| Example search | `patient.drug.medicinalproduct:"METFORMIN"` |
| Cache strategy | `no-store` live query behavior |
| Dataset freshness | openFDA `last_updated` metadata is surfaced when available |

Public provenance URLs intentionally omit `OPENFDA_API_KEY` values.

## FAERS Analysis Snapshot

The mocked sample analysis uses the same shape as the dashboard and Playwright smoke tests.

| Metric | Sample value |
| --- | ---: |
| Total suspect-drug FAERS reports | 3,210 |
| Top MedDRA preferred term | NAUSEA |
| NAUSEA reports | 120 |
| DIARRHOEA reports | 80 |
| VOMITING reports | 50 |
| Serious reports | 700 |
| Non-serious reports | 2,510 |
| Hospitalization outcome flags | 44 |

FAERS reports cannot establish incidence, prevalence, clinical risk, or causality. Report counts may reflect under-reporting, duplicate reporting, stimulated reporting, missing values, and reporting bias.

## Signal Metrics

Selected drug-event pair: metformin and NAUSEA.

| 2x2 reporting table | Selected event | Other events |
| --- | ---: | ---: |
| Selected drug | 120 | 3,090 |
| Other drugs | 9,500 | 150,000 |

| Metric | Sample value |
| --- | ---: |
| PRR | 2.10 |
| ROR | 2.20 |
| ROR lower 95% CI | 2.00 |
| ROR upper 95% CI | 2.40 |

Interpretation: this sample would be labeled as an elevated reporting signal hypothesis because the selected event is reported disproportionately often with the selected drug in FAERS. This does not prove that metformin caused nausea and does not estimate real-world risk.

## Drug Comparison

Selected comparison: metformin vs warfarin for NAUSEA.

| Drug | Event reports | Total suspect-drug reports | Event share per 1,000 reports | PRR | ROR |
| --- | ---: | ---: | ---: | ---: | ---: |
| metformin | 120 | 3,210 | 37.38 | 2.10 | 2.20 |
| warfarin | 50 | 5,000 | 10.00 | 1.10 | 1.20 |

This is a reporting-share comparison, not a clinical risk comparison.

## Structured AI Report

### Safety Signal Overview

metformin matched 3,210 suspect-drug FAERS reports. This aggregate workflow supports technical portfolio review by showing how medication-label intake, openFDA queries, PRR/ROR metrics, drug comparison, and schema-validated report generation fit together. These counts support signal triage and hypothesis generation, but they cannot establish incidence, prevalence, clinical risk, or causality.

### Key Patterns

- Most frequently reported reactions: NAUSEA (120), DIARRHOEA (80), VOMITING (50).
- Seriousness distribution: Serious (700), Non-serious (2,510).
- Serious outcome flags: Hospitalization (44).
- Source provenance exposes openFDA endpoint, search assumptions, and public request URLs.
- The same workflow can be launched from a typed drug name or a human-confirmed medication-label candidate.

### Reviewer Follow-up

- Review duplicate reports, co-medications, indication, dose, chronology, and dechallenge/rechallenge evidence before escalating a signal.
- Compare the drug-event pattern against class alternatives and background disease risk before forming a safety hypothesis.
- Use source query URLs to reproduce aggregate counts and document any follow-up search refinements.
- Confirm whether label evidence was OCR-derived or manually entered before using it as a workflow starting point.

### Limitations

- FAERS reports cannot establish incidence, prevalence, clinical risk, or causality.
- Aggregate counts can be affected by missing values, duplicates, reporting bias, and stimulated reporting.
- PRR and ROR are disproportionality-style signal triage metrics, not causal proof.
- OCR and medication-label extraction may miss or distort medication fields.
- This sample report is generated from deterministic mocked workflow data for portfolio demonstration.

### Report Quality Checklist

- No causal claims from FAERS report counts.
- No incidence, prevalence, or true-risk estimates.
- FAERS limitations are stated explicitly.
- Reviewer follow-up questions are included.
- Signal language is framed as hypothesis generation.

## Portfolio Notes

This sample report demonstrates the project qualities that are most important for AI, pharmacy informatics, biotech analytics, and drug safety roles:

- Public health data integration through openFDA FAERS.
- Domain-specific analytics through PRR/ROR and MedDRA preferred-term reporting.
- Responsible AI controls through schema validation, prompt versioning, fallback modes, and explicit limitations.
- Human-in-the-loop medication-label intake before any automated pharmacovigilance workflow starts.
- Exportable reviewer artifacts that can be discussed without needing live provider keys.
