import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/report", () => {
  it("returns 400 for malformed JSON bodies", async () => {
    const response = await POST(
      new Request("http://localhost/api/report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "{not-json",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid JSON request body.",
    });
  });
});
