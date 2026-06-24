# Web App

This workspace package contains the Next.js App Router implementation for the AI Pharmacovigilance Platform.

For the full portfolio overview, screenshots, architecture, deployment instructions, and resume framing, start at the repository root [README.md](../../README.md).

## Responsibilities

- Reviewer dashboard UI in `src/components/PharmacovigilanceDashboard.tsx`
- openFDA FAERS aggregate API route in `src/app/api/faers/route.ts`
- PRR/ROR signal route in `src/app/api/signal/route.ts`
- Signal ranking route in `src/app/api/rankings/route.ts`
- Drug comparison route in `src/app/api/compare/route.ts`
- Medication-label intake route in `src/app/api/intake/medication/route.ts`
- Structured report route in `src/app/api/report/route.ts`
- Domain logic and tests in `src/lib/`

## Local Development

Run commands from the repository root so npm workspaces resolve correctly:

```bash
npm install
npm run dev
```

Then open the local URL printed by Next.js, usually:

```text
http://localhost:3000
```

If port `3000` is already used by another local Next.js app, run this package on `3001`:

```bash
npm --workspace apps/web run dev -- --port 3001
```

Then open:

```text
http://localhost:3001
```

## Environment

Local environment variables live in `apps/web/.env.local`. Start from the root example:

```bash
cp ../../.env.example .env.local
```

Provider keys are optional:

- `OPENFDA_API_KEY` raises openFDA rate limits.
- `OPENAI_API_KEY` enables live OpenAI report generation.
- `DEEPSEEK_API_KEY` enables live DeepSeek-compatible medication intake.
- Missing OpenAI or DeepSeek keys intentionally trigger deterministic fallback modes with the same schema contracts.

## Verification

From the repository root:

```bash
npm run check:deploy
npm run test
npm run test:e2e
npm run lint
npm run build
```

The Playwright smoke tests use mocked API responses so the main reviewer workflow can be verified without live provider keys.
