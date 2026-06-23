import { NextResponse } from "next/server";
import { z } from "zod";
import { compareDrugs } from "@/lib/comparison";

const querySchema = z.object({
  primary: z.string().trim().min(2).max(80),
  comparator: z.string().trim().min(2).max(80),
  event: z.string().trim().min(2).max(120),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    primary: searchParams.get("primary"),
    comparator: searchParams.get("comparator"),
    event: searchParams.get("event"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Provide primary, comparator, and event query parameters.",
      },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      await compareDrugs(
        parsed.data.primary,
        parsed.data.comparator,
        parsed.data.event,
      ),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to compare drugs.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 502 },
    );
  }
}
