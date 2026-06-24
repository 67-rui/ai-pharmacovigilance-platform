# PDF Report Export Design

## Goal

Add a reviewer-ready PDF export to the AI Pharmacovigilance Workspace so a portfolio reviewer can download a concrete safety-report artifact from a completed FAERS and AI-report workflow.

## Design

The export will be browser-side to avoid new server infrastructure. A focused `pdfReport` library will turn the current FAERS analysis, optional signal metrics, optional ranking, optional drug comparison, and AI report response into ordered report sections. The UI will use `jspdf` only at the final rendering/download step.

## Scope

- Add a pure `buildPdfReportSections` helper with unit coverage.
- Include core reviewer content: drug, generated time, FAERS report count, top reported reaction, PRR/ROR signal metrics when present, ranked signal candidates when present, comparison summary when present, structured AI report sections, quality checklist, and FAERS limitations.
- Add an `Export PDF` button beside the existing Markdown export.
- Keep Markdown export unchanged.
- Do not add server-side PDF generation or persistent storage.

## Safety

The PDF must preserve the same responsible-AI boundaries as the app: schema validation status, provider mode, prompt version, FAERS limitations, and language that frames signals as hypothesis generation rather than causality.
