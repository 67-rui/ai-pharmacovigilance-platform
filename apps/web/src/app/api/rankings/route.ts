import { NextResponse } from "next/server";
import { z } from "zod";
import { buildSignalRanking } from "../../../lib/ranking";
import { analyzeSignal } from "../../../lib/signal";
import { limitPublicDemoRequest } from "../publicDemoRateLimit";

const MAX_RANKING_EVENTS = 8;

const querySchema = z.object({
  drug: z.string().trim().min(2).max(80),
  events: z.array(z.string().trim().min(2).max(120)).min(1).max(MAX_RANKING_EVENTS),
});

function uniqueEvents(events: string[]) {
  const seen = new Set<string>();
  return events
    .map((event) => event.trim().toUpperCase())
    .filter((event) => {
      if (!event || seen.has(event)) return false;
      seen.add(event);
      return true;
    })
    .slice(0, MAX_RANKING_EVENTS);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    drug: searchParams.get("drug"),
    events: uniqueEvents(searchParams.getAll("event")),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: `Provide a drug and 1-${MAX_RANKING_EVENTS} event query parameters.`,
      },
      { status: 400 },
    );
  }

  const rateLimitResponse = limitPublicDemoRequest(request, {
    namespace: "rankings",
    envLimitName: "PUBLIC_DEMO_RANKINGS_RATE_LIMIT",
    defaultLimit: 20,
    label: "signal ranking",
  });

  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const signals = await Promise.all(
      parsed.data.events.map((event) => analyzeSignal(parsed.data.drug, event)),
    );

    return NextResponse.json(buildSignalRanking(parsed.data.drug, signals));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to rank signal candidates.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 502 },
    );
  }
}
