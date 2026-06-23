import { describe, expect, it } from "vitest";
import { buildDrugSearch } from "./openfda";

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
