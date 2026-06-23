import { describe, expect, it } from "vitest";
import { buildAgeDistribution, buildDrugSearch } from "./openfda";

describe("buildDrugSearch", () => {
  it("matches suspect-drug reports across generic, brand, and medicinal product fields", () => {
    const search = buildDrugSearch("metformin");

    expect(search).toContain("patient.drug.drugcharacterization:1");
    expect(search).toContain('patient.drug.openfda.generic_name:"metformin"');
    expect(search).toContain('patient.drug.openfda.brand_name:"metformin"');
    expect(search).toContain('patient.drug.medicinalproduct:"metformin"');
  });

  it("normalizes whitespace and escapes quotes", () => {
    const search = buildDrugSearch('  test "drug"  name  ');

    expect(search).toContain('patient.drug.openfda.generic_name:"test \\"drug\\" name"');
  });
});

describe("buildAgeDistribution", () => {
  it("ignores non-numeric age labels instead of grouping them into the oldest bucket", () => {
    expect(
      buildAgeDistribution([
        { label: "not specified", value: 10 },
        { label: "44", value: 5 },
        { label: "85", value: 2 },
      ]),
    ).toEqual([
      { label: "18-44", value: 5 },
      { label: "85+", value: 2 },
    ]);
  });
});
