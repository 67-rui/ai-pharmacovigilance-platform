import { NextResponse } from "next/server";

const apiRoutes = [
  "/api/faers",
  "/api/signal",
  "/api/rankings",
  "/api/compare",
  "/api/report",
  "/api/intake/medication",
];

const safetyBoundaries = [
  "schema validation",
  "human confirmation before label-derived FAERS launch",
  "FAERS cannot establish incidence or causality",
];

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      app: "ai-pharmacovigilance-platform",
      generatedAt: new Date().toISOString(),
      providers: {
        openfda: process.env.OPENFDA_API_KEY ? "key-configured" : "public",
        report: process.env.OPENAI_API_KEY ? "openai" : "template",
        medicationIntake: process.env.DEEPSEEK_API_KEY ? "deepseek" : "fallback",
      },
      apiRoutes,
      safetyBoundaries,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
