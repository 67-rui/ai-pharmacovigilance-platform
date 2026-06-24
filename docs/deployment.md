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

The repository includes `vercel.json` so the important project settings travel with the code:

- Framework: `nextjs`
- Install command: `npm install`
- Build command: `npm run build`
- Dev command: `npm run dev`
- Node runtime: `>=20` from `package.json`

GitHub import path:

1. Import `67-rui/ai-pharmacovigilance-platform` into Vercel.
2. Set the project root to the repository root.
3. Confirm Vercel picks up `vercel.json`.
4. Configure optional environment variables in Vercel Project Settings.
5. Deploy from `main`.

CLI path after logging in:

```bash
npx vercel login
npx vercel link
npx vercel env add OPENFDA_API_KEY production
npx vercel --prod
```

`OPENFDA_API_KEY` is optional but recommended for a public demo. Leave `OPENAI_API_KEY` and `DEEPSEEK_API_KEY` unset if you want the deterministic fallback modes to stay visible.

The app uses API routes for `/api/faers`, `/api/signal`, `/api/rankings`, `/api/compare`, `/api/report`, and `/api/intake/medication`, so static-only hosting is not sufficient.

After deployment, verify the public URL with the automated smoke script:

```bash
DEMO_URL=https://your-project.vercel.app npm run smoke:demo
```

The smoke script opens Chrome with Playwright and checks the homepage, `/?drug=metformin&workflow=full`, and the medication label-text confirmation path. It uses live API routes by default. For a local self-check of the smoke script itself, run against a local dev server with mocked API responses:

```bash
npm run smoke:demo -- http://localhost:3000 --mock
```

Live smoke failures can reflect deployment regressions, openFDA latency or rate limits, or optional AI-provider outages. Mock mode only proves the browser workflow and selectors; it is not a substitute for testing the deployed public URL.

## Safe Demo Configuration

For a public portfolio demo:

- Prefer setting `OPENFDA_API_KEY` to reduce public API rate-limit friction.
- Keep `OPENAI_API_KEY` and `DEEPSEEK_API_KEY` optional unless you want live provider calls.
- Leave browser OCR enabled; it runs locally in the browser and does not require a server-side key.
- Use the fallback modes as a deliberate responsible-AI demo: the UI exposes provider mode, warning state, prompt version, schema validation, and limitations.
- Share `/?drug=metformin&workflow=full` as a reproducible reviewer workflow URL.

## Smoke Test After Deployment

After deploying, run:

```bash
DEMO_URL=https://your-project.vercel.app npm run smoke:demo
```

Then use this browser checklist for manual review:

1. Open `/?drug=metformin`.
2. Confirm the dashboard loads FAERS aggregate charts and source provenance.
3. Click `Run full workflow`.
4. Confirm PRR/ROR signal metrics, signal ranking, comparison, and the schema-validated report appear.
5. Open `/?drug=metformin&workflow=full` and confirm it reruns the reviewer workflow from the URL.
6. Paste a short medication label text into the intake panel, run intake, confirm the candidate, and confirm the full workflow starts only after human confirmation.
7. Check that fallback warnings are visible if provider keys are not configured.

## Observability

Use [observability.md](observability.md) as the production-thinking companion for this deployment guide. It lists latency boundaries, provider fallback events, schema validation failures, OCR quality signals, and healthcare-adjacent privacy rules worth tracking if this prototype is promoted beyond a local portfolio demo.

At minimum, deployment logs should distinguish:

- live openFDA failures or rate limits from no-result queries
- expected deterministic fallback when provider keys are missing from unexpected fallback when keys are configured
- schema validation failures from successful template fallback behavior
- OCR quality problems from medication-intake provider failures

## Operational Notes

- FAERS responses are live public-health data and may change over time.
- The dashboard intentionally uses aggregate count queries instead of downloading full case reports.
- FAERS API calls use a `no-store` cache strategy in the app route. Source provenance displays openFDA `last_updated` metadata when the API response provides it, so reviewers can distinguish live query freshness from saved local history.
- Public source URLs omit `OPENFDA_API_KEY` values.
- Local FAERS analysis history, reviewer report history, and confirmed intake evidence history are stored in the browser with `localStorage`; they are not server-side persistence.
- The app is not medical advice, clinical decision support, or a causality engine.

## Troubleshooting

- **openFDA 429 or intermittent failures:** configure `OPENFDA_API_KEY` or retry later.
- **No FAERS reports found:** try a generic or brand name that exists in FAERS; the app returns a 404 rather than rendering an empty analysis as evidence.
- **Report returns template mode:** `OPENAI_API_KEY` is missing or the provider response failed schema validation.
- **Medication intake returns fallback mode:** `DEEPSEEK_API_KEY` is missing or the provider response failed schema validation.
- **OCR is poor on low-quality images:** switch the intake panel to Enhanced OCR, crop the label, or paste corrected label text manually before running intake.
- **Build passes but dev server changes `apps/web/next-env.d.ts`:** restore the generated dev-type imports before committing; this file is generated by Next.js.
