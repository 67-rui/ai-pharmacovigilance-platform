import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeSignal } from "@/lib/signal";

const querySchema = z.object({
  drug: z.string().trim().min(2).max(80),
  event: z.string().trim().min(2).max(120),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    drug: searchParams.get("drug"),
    event: searchParams.get("event"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Provide a drug and event between 2 and 120 characters.",
      },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      await analyzeSignal(parsed.data.drug, parsed.data.event),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to analyze signal.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 502 },
    );
  }
}
