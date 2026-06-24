import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeFaersDrug } from "../../../lib/openfda";

const querySchema = z.object({
  drug: z.string().trim().min(2).max(80),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    drug: searchParams.get("drug"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Provide a drug name between 2 and 80 characters.",
      },
      { status: 400 },
    );
  }

  try {
    const analysis = await analyzeFaersDrug(parsed.data.drug);
    return NextResponse.json(analysis);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to query FAERS data.";

    return NextResponse.json(
      {
        error: message,
      },
      { status: 502 },
    );
  }
}
