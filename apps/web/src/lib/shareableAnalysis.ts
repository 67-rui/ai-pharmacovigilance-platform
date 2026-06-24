export function parseShareableAnalysisParams(search: string) {
  const params = new URLSearchParams(search);
  const drug = params.get("drug")?.trim();

  if (!drug || drug.length < 2) return null;

  return {
    drug,
    runWorkflow: params.get("workflow") === "full",
  };
}

export function parseShareableLabelParams(search: string) {
  const params = new URLSearchParams(search);

  return {
    sampleLabel: params.get("label") === "sample",
  };
}

export function buildShareableAnalysisSearch(
  drug: string,
  options?: { runWorkflow?: boolean },
) {
  const params = new URLSearchParams();
  params.set("drug", drug.trim());

  if (options?.runWorkflow) {
    params.set("workflow", "full");
  }

  return `?${params.toString()}`;
}
