# Observability Notes

This project is a portfolio prototype, but the workflow touches healthcare-adjacent data and external AI/API providers. Observability should help a reviewer distinguish normal fallback behavior from broken live integrations without logging sensitive label text or creating false clinical confidence.

## What To Watch

| Workflow | Expected behavior | Watch for |
| --- | --- | --- |
| FAERS analysis | Common drug aggregate queries should usually complete in 1-5 seconds. | openFDA 429s, 5xx responses, slow aggregate counts, empty-result 404s, malformed responses. |
| Signal ranking | Runs several signal checks after a FAERS result. | One slow signal query delaying the full workflow, repeated upstream failures for the same event set. |
| Drug comparison | Runs primary and comparator event-share calculations. | Comparator failures, zero-denominator cases, very low event counts. |
| Medication OCR | Browser-side Standard/Enhanced OCR depends on image quality and local device speed. | Empty OCR text, poor quality score, user retries with Enhanced OCR. |
| Medication intake | DeepSeek mode should return schema-valid JSON; fallback mode is expected without a key. | Provider errors, invalid JSON, schema validation failures, unexpected provider fallback spikes. |
| AI report generation | OpenAI mode should return schema-valid structured reports; template mode is expected without a key. | Provider errors, schema validation failures, template-mode spikes when a key is configured. |
| Human confirmation | Label intake must not launch FAERS until the user confirms a candidate. | Any analysis triggered without a confirmation event. |

## Suggested Events

Use structured logs. Keep event names stable so a simple log drain or analytics tool can group them later.

| Event | Useful fields | Notes |
| --- | --- | --- |
| `faers.query.started` | `route`, `drug_hash`, `query_kind` | Hash or truncate drug names if logs leave the local demo. |
| `faers.query.completed` | `duration_ms`, `status`, `total_reports`, `query_kind` | Use for latency percentiles and no-result analysis. |
| `faers.query.failed` | `duration_ms`, `status_code`, `error_code`, `query_kind` | Distinguish openFDA 429 from 5xx and malformed responses. |
| `signal.workflow.completed` | `duration_ms`, `event_count`, `fallback_used` | Measures the full reviewer workflow, not one query. |
| `ocr.completed` | `mode`, `duration_ms`, `quality`, `quality_score`, `text_length_bucket` | Do not log raw OCR text. |
| `ocr.failed` | `mode`, `error_code`, `file_size_bucket` | Avoid image names if they could contain patient details. |
| `intake.provider.completed` | `provider`, `duration_ms`, `schema_valid`, `candidate_count` | Provider is `deepseek` or `fallback`. |
| `intake.provider.fallback` | `reason`, `schema_valid`, `prompt_version` | Expected when no key is configured; suspicious when a key is configured. |
| `report.provider.completed` | `mode`, `duration_ms`, `schema_valid`, `prompt_version`, `tone` | Mode is `openai` or `template`. |
| `report.provider.fallback` | `reason`, `prompt_version`, `tone` | Useful for provider drift or schema failures. |
| `human.confirmation.completed` | `source`, `candidate_rank`, `confidence` | Confirms the responsible-AI gate fired before FAERS routing. |

## Latency Triage

Start with the workflow boundary, then move inward:

1. If the dashboard loads but FAERS analysis is slow, compare `faers.query.completed.duration_ms` by `query_kind`. Top reaction and year-trend aggregate queries are likely bottlenecks because the dashboard runs several openFDA calls in parallel.
2. If the full workflow is slow after FAERS completes, inspect `signal.workflow.completed.duration_ms` and count how many signal/ranking/comparison calls ran.
3. If report generation is slow, compare `report.provider.completed.mode`. OpenAI mode is network and model dependent; template mode should be fast.
4. If medication intake is slow, separate OCR time from DeepSeek intake time. Browser OCR depends on image size, device speed, and Enhanced preprocessing.
5. If latency only appears in live provider mode, run the same flow with provider keys disabled. Deterministic fallback behavior should isolate whether the issue is local app logic or an external provider.

## Fallback And Failure Interpretation

Fallback is a deliberate safety behavior in this project, not always an error.

- Missing `OPENAI_API_KEY` means `/api/report` returns template mode. This keeps the demo usable and schema-valid.
- Missing `DEEPSEEK_API_KEY` means `/api/intake/medication` returns local fallback extraction.
- Provider responses that fail JSON parsing or zod schema validation should fall back and emit a visible warning.
- openFDA 404/no-result should be treated differently from provider fallback. It means no matching FAERS reports were found for the query, not that the app generated a local replacement.
- openFDA 429 indicates rate limiting. Add `OPENFDA_API_KEY`, retry later, or reduce automated test traffic.
- OCR poor quality is not a provider outage. The user should crop the image, use Enhanced OCR, or edit text before intake.

## Privacy And Safety Rules

Logs for this app should be boring on purpose.

- Do not log raw OCR text, medication label images, uploaded filenames that may contain patient identifiers, or full free-text report prompts.
- Do not log API keys, request headers, or provider response bodies.
- Prefer counts, booleans, prompt versions, schema validity, quality labels, duration, status code, and coarse text-length buckets.
- If a drug name is logged outside local development, hash it or record a normalized demo-safe category such as `known_fixture`, `manual_entry`, or `confirmed_label_candidate`.
- Keep FAERS limitations visible in user-facing reports: spontaneous reports are signal-triage evidence, not incidence, prevalence, true risk, causality, or medical advice.
- Treat human confirmation as an auditable safety event. The app should never route OCR-derived candidates into analysis without confirmation.

## Production Follow-Up

A production version would add a small server-side logger wrapper around each App Router API route, then forward JSON logs to the hosting provider log drain. Useful dashboard panels would include:

- p50/p95 latency by API route and provider mode.
- openFDA 429/5xx counts by route.
- DeepSeek/OpenAI fallback counts by reason.
- zod schema validation failure counts by prompt version.
- OCR quality distribution by Standard vs Enhanced mode.
- Human-confirmed label candidates versus discarded candidates.

These metrics keep the demo honest: live APIs can drift or slow down, but deterministic fallback and schema validation should keep the reviewer workflow explainable.
