# Deployment And Environment Guide

This guide describes how to run and deploy the AI Pharmacovigilance Platform without exposing secrets or depending on paid AI providers for the core demo path.

## Deployment Goal

The deployed app should demonstrate a responsible pharmacovigilance workflow:

- Drug-name or confirmed medication-label evidence enters the dashboard.
- openFDA FAERS aggregate queries produce reproducible signal-triage data.
- PRR/ROR signal metrics, ranking, drug comparison, and structured AI report output run from the same reviewer workspace.
- AI outputs remain schema-validated and framed with FAERS safety limitations.
- Missing provider keys degrade into deterministic fallback behavior instead of breaking the demo.

## Required Runtime

- Node.js 20 or later.
- npm workspaces from the repository root.
- A deployment target that supports Next.js App Router API routes.

Recommended commands:

```bash
npm install
npm run test
npm run lint
npm run build
```

## Environment Variables

Copy `apps/web/.env.example` to `apps/web/.env.local` for local development, or configure the same names in your hosting provider.

| Variable | Required | Purpose | Fallback behavior |
| --- | --- | --- | --- |
| `OPENFDA_API_KEY` | No | Raises openFDA rate limits for FAERS aggregate queries. | Public openFDA requests are used without a key. |
| `OPENAI_API_KEY` | No | Enables OpenAI structured report generation. | `/api/report` returns a deterministic template report with the same schema. |
| `OPENAI_MODEL` | No | Selects the OpenAI Responses API model. | Defaults to `gpt-5.5`. |
| `DEEPSEEK_API_KEY` | No | Enables DeepSeek medication-label extraction after OCR text is produced. | `/api/intake/medication` returns deterministic local extraction with the same schema. |
| `DEEPSEEK_MODEL` | No | Selects the DeepSeek chat model. | Defaults to `deepseek-chat`. |

Browser OCR, Enhanced OCR preprocessing, and OCR quality scoring run locally in the browser and do not require a provider key. Do not commit `.env.local` or plaintext API keys. The app is designed so a portfolio reviewer can still see the core workflow without OpenAI or DeepSeek keys.

## Vercel Deployment

1. Import the GitHub repository into Vercel.
2. Set the project root to the repository root.
3. Use the default npm install command.
4. Use `npm run build` as the build command.
5. Configure optional environment variables in Vercel Project Settings.
6. Deploy from `main`.

The app uses API routes for `/api/faers`, `/api/signal`, `/api/rankings`, `/api/compare`, `/api/report`, and `/api/intake/medication`, so static-only hosting is not sufficient.

## Safe Demo Configuration

For a public portfolio demo:

- Prefer setting `OPENFDA_API_KEY` to reduce public API rate-limit friction.
- Keep `OPENAI_API_KEY` and `DEEPSEEK_API_KEY` optional unless you want live provider calls.
- Leave browser OCR enabled; it runs locally in the browser and does not require a server-side key.
- Use the fallback modes as a deliberate responsible-AI demo: the UI exposes provider mode, warning state, prompt version, schema validation, and limitations.
- Share `/?drug=metformin&workflow=full` as a reproducible reviewer workflow URL.

## Smoke Test After Deployment

After deploying, run this checklist in the browser:

1. Open `/?drug=metformin`.
2. Confirm the dashboard loads FAERS aggregate charts and source provenance.
3. Click `Run full workflow`.
4. Confirm PRR/ROR signal metrics, signal ranking, comparison, and the schema-validated report appear.
5. Open `/?drug=metformin&workflow=full` and confirm it reruns the reviewer workflow from the URL.
6. Paste a short medication label text into the intake panel, run intake, confirm the candidate, and confirm the full workflow starts only after human confirmation.
7. Check that fallback warnings are visible if provider keys are not configured.

## Operational Notes

- FAERS responses are live public-health data and may change over time.
- The dashboard intentionally uses aggregate count queries instead of downloading full case reports.
- Public source URLs omit `OPENFDA_API_KEY` values.
- Local reviewer history and confirmed intake evidence history are stored in the browser with `localStorage`; they are not server-side persistence.
- The app is not medical advice, clinical decision support, or a causality engine.

## Troubleshooting

- **openFDA 429 or intermittent failures:** configure `OPENFDA_API_KEY` or retry later.
- **Report returns template mode:** `OPENAI_API_KEY` is missing or the provider response failed schema validation.
- **Medication intake returns fallback mode:** `DEEPSEEK_API_KEY` is missing or the provider response failed schema validation.
- **OCR is poor on low-quality images:** switch the intake panel to Enhanced OCR, crop the label, or paste corrected label text manually before running intake.
- **Build passes but dev server changes `apps/web/next-env.d.ts`:** restore the generated dev-type imports before committing; this file is generated by Next.js.
