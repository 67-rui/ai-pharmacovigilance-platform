# Multimodal Evidence Agent Design

Date: 2026-06-23

## Goal

Build a new standalone portfolio project named `multimodal-evidence-agent`.

The project is a technical-depth AI engineering system for multimodal evidence analysis. It helps a user turn a research question plus mixed materials into grounded findings, lightweight data analysis, and a citation-backed evidence brief. The project should demonstrate agent workflow design, multimodal input handling, data analysis, source grounding, evaluation, and production-minded fallback behavior.

## Target User

The primary user is an analyst, AI engineer, or researcher who needs to review heterogeneous materials quickly:

- Research text or pasted excerpts.
- CSV data tables.
- Images such as chart screenshots, table screenshots, or figure panels.
- PDFs, initially through a basic text-extraction path or an extensible adapter.

The first portfolio framing is broader than one domain, but examples should lean toward healthcare, biotech, public health, or technology analysis because those domains make evidence quality, provenance, and uncertainty especially visible.

## MVP Scope

The MVP must provide a complete local demo loop:

1. A standalone project directory at `/Users/a67_2024/Documents/Git_WorkFlow/multimodal-evidence-agent`.
2. A web workspace where the user enters a research question and provides source materials.
3. Support for text input, CSV upload or paste, and image upload.
4. A structured agent pipeline:
   - Plan research subtasks from the question and available sources.
   - Extract evidence from text.
   - Analyze CSV columns with simple descriptive statistics and trend or category summaries.
   - Register image inputs as visual evidence with model-ready metadata and local fallback descriptions.
   - Synthesize grounded findings.
   - Generate a Markdown evidence brief.
5. Evidence cards that show claim, source, source type, confidence, and limitations.
6. A deterministic fallback path that works without `OPENAI_API_KEY`.
7. Optional OpenAI-backed generation when `OPENAI_API_KEY` is present.
8. A small evaluation harness with 5 to 10 fixture tasks that checks whether generated findings cite relevant sources and respect uncertainty.
9. README documentation with architecture, demo workflow, limitations, and resume bullets.

The MVP should not try to become a universal autonomous research product. It should remain a focused evidence-analysis workspace.

## Non-Goals

- No production authentication or multi-user workspace.
- No large-scale vector database in the first version.
- No claims that the system proves causality or replaces expert review.
- No hidden web browsing in the MVP.
- No complex PDF layout reconstruction in the first pass.

## Architecture

Use a Next.js and TypeScript full-stack prototype.

Suggested structure:

```text
multimodal-evidence-agent/
  apps/web/
    src/app/
      api/analyze/route.ts
      api/eval/route.ts
      page.tsx
    src/components/
      EvidenceWorkspace.tsx
      EvidenceCard.tsx
      AgentTimeline.tsx
      ReportPanel.tsx
    src/lib/
      agent/
        planner.ts
        pipeline.ts
        synthesizer.ts
      tools/
        textTool.ts
        csvTool.ts
        imageTool.ts
        pdfTool.ts
      eval/
        fixtures.ts
        scorer.ts
      report/
        markdown.ts
      types.ts
  docs/
    prompts/
    eval/
  README.md
```

## Data Flow

1. The user submits a research question and one or more sources.
2. The API normalizes each source into a shared `SourceDocument` model.
3. The planner creates a short list of subtasks, such as "extract key claims", "summarize CSV distributions", or "inspect image evidence".
4. Tool modules produce typed observations:
   - Text observations: quoted snippets and inferred claims.
   - CSV observations: row count, columns, missingness, numeric summaries, categorical counts.
   - Image observations: file metadata, alt description, and optional model-generated visual summary.
   - PDF observations: extracted text or a clear fallback limitation.
5. The synthesizer converts observations into grounded findings.
6. The report generator creates a Markdown evidence brief with findings, evidence strength, citations, limitations, and follow-up questions.
7. The UI renders the plan, evidence cards, data summary, and report.

## Core Types

The implementation should keep strict typed boundaries:

- `SourceDocument`: source id, name, type, content or file metadata.
- `AgentPlan`: ordered steps with tool names and rationale.
- `Observation`: tool output tied to a source id.
- `EvidenceFinding`: claim, source ids, confidence, support summary, limitations.
- `EvidenceBrief`: title, executive summary, findings, uncertainty notes, follow-up questions.
- `EvalCase`: question, sources, expected evidence keywords, prohibited claim patterns.

## Error Handling

- Invalid or empty source submissions return clear validation errors.
- CSV parsing errors identify the problematic source and preserve other valid sources.
- Missing model credentials should not break the app; the local fallback pipeline must still produce a useful report.
- Image and PDF support should state limitations honestly when advanced extraction is not available.
- The agent timeline should expose failed steps rather than hiding them.

## Testing And Evaluation

Baseline verification:

- Unit tests for planner behavior.
- Unit tests for CSV summaries and evidence synthesis.
- API route tests for invalid submissions and deterministic fallback output.
- Evaluation fixtures for 5 to 10 small research tasks.

Evaluation checks:

- Findings cite at least one relevant source.
- Reports include limitations when evidence is weak.
- Reports avoid overclaiming causal conclusions.
- CSV-derived findings match expected numeric or categorical summaries.

## Resume Story

The finished project should support this resume framing:

> Built a multimodal evidence-analysis agent that plans research tasks, extracts grounded findings from text, CSV, and image inputs, performs lightweight data analysis, and generates citation-backed evidence briefs with deterministic fallbacks and a small evaluation harness.

## First Implementation Slice

The first implementation should prioritize a working local product over maximal AI sophistication:

1. Scaffold the standalone Next.js project.
2. Build the workspace UI with research question, source inputs, agent timeline, evidence cards, and report panel.
3. Implement deterministic planner, text tool, CSV tool, image metadata tool, synthesizer, and Markdown report generator.
4. Add `/api/analyze` and tests.
5. Add eval fixtures and a simple scorer.
6. Write README and resume bullets.

## OpenAI Integration Slice

After the deterministic MVP works:

1. Add optional `OPENAI_API_KEY` support.
2. Use OpenAI for richer synthesis and optional image interpretation.
3. Keep prompt versioning in `docs/prompts/`.
4. Validate model output against a schema before rendering.
5. Fall back to deterministic synthesis on API failure.
