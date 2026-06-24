# PDF Report Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a browser-side PDF export that turns completed FAERS and AI report results into a reviewer-ready pharmacovigilance artifact.

**Architecture:** A pure `apps/web/src/lib/pdfReport.ts` module builds ordered report sections from existing domain types. The React dashboard imports that builder and uses `jspdf` to render wrapped text into a downloaded PDF.

**Tech Stack:** Next.js, React, TypeScript, Vitest, jsPDF.

---

### Task 1: Report Section Builder

**Files:**
- Create: `apps/web/src/lib/pdfReport.ts`
- Test: `apps/web/src/lib/pdfReport.test.ts`

- [x] Write failing tests for `buildPdfReportSections`.
- [x] Run `npm run test -- apps/web/src/lib/pdfReport.test.ts` and confirm the missing module/function failure.
- [x] Implement the minimal section builder.
- [x] Re-run the focused test and confirm it passes.

### Task 2: Browser PDF Export

**Files:**
- Modify: `apps/web/package.json`
- Modify: `package-lock.json`
- Modify: `apps/web/src/components/PharmacovigilanceDashboard.tsx`

- [x] Install `jspdf` in the web workspace.
- [x] Add `exportReportPdf` in the dashboard and render an `PDF` export button next to the existing `MD` button.
- [x] Keep existing Markdown export behavior unchanged.

### Task 3: Documentation And Verification

**Files:**
- Modify: `README.md`
- Modify: `docs/roadmap.md`

- [x] Update README feature list and verification coverage for PDF export.
- [x] Mark PDF report export complete in roadmap and move the next action list forward.
- [x] Run `git diff --check`, `npm run test`, `npm run lint`, `npm run build`, and `npm audit --audit-level=moderate`.
- [ ] Commit and push.
