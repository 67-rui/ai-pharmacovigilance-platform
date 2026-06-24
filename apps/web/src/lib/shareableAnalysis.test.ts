import { describe, expect, it } from "vitest";
import {
  buildShareableAnalysisSearch,
  parseShareableLabelParams,
  parseShareableAnalysisParams,
} from "./shareableAnalysis";

describe("shareable analysis URLs", () => {
  it("parses a trimmed drug candidate from the query string", () => {
    expect(parseShareableAnalysisParams("?drug=%20Metformin%20")).toEqual({
      drug: "Metformin",
      runWorkflow: false,
    });
  });

  it("ignores missing or too-short drug parameters", () => {
    expect(parseShareableAnalysisParams("?drug=a")).toBeNull();
    expect(parseShareableAnalysisParams("?event=NAUSEA")).toBeNull();
  });

  it("builds a stable query string for the selected drug", () => {
    expect(buildShareableAnalysisSearch("Metformin XR")).toBe("?drug=Metformin+XR");
  });

  it("round-trips full workflow URLs", () => {
    const search = buildShareableAnalysisSearch("Metformin", { runWorkflow: true });

    expect(search).toBe("?drug=Metformin&workflow=full");
    expect(parseShareableAnalysisParams(search)).toEqual({
      drug: "Metformin",
      runWorkflow: true,
    });
  });

  it("parses the sample label evidence shortcut separately from drug analysis", () => {
    expect(parseShareableLabelParams("?label=sample")).toEqual({
      sampleLabel: true,
    });
    expect(parseShareableLabelParams("?drug=metformin&label=sample")).toEqual({
      sampleLabel: true,
    });
    expect(parseShareableLabelParams("?label=unknown")).toEqual({
      sampleLabel: false,
    });
  });
});
