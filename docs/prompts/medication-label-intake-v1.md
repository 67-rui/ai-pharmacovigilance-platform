# Medication Label Intake Prompt v1

Version: `medication-label-intake-v1`

## Purpose

Extract structured medication-label fields from OCR or user-provided label text for a pharmacovigilance intake workflow. The result helps a reviewer confirm a drug candidate before routing it into FAERS analysis.

This prompt is designed for DeepSeek chat-completions-compatible text extraction. It does not assume direct image understanding. Image files are retained in the UI as visual evidence, while OCR or label text is the model input.

## Output Contract

The model must return strict JSON only. The API validates the response with zod before rendering it or using it to populate the dashboard.

Required object keys:

- `provider`: must be `deepseek`.
- `drugCandidates`: array of possible drug names found in the OCR text.
- `activeIngredients`: array of active ingredients or salt forms present in the text.
- `strengths`: array of strengths or concentrations such as `500 mg`.
- `dosageForm`: short dosage form when visible, such as `tablet` or `capsule`.
- `riskKeywords`: array of safety-relevant label terms such as warnings, contraindications, adverse reactions, renal impairment, pregnancy, or interactions.
- `confidence`: `low`, `medium`, or `high`.
- `needsHumanConfirmation`: boolean, normally `true`.
- `extractedText`: the OCR or label text used for extraction.
- `evidence`: object with `fileName` and `sourceType`.
- `limitations`: array of extraction limitations.

## Safety Boundary

The model must not provide diagnosis, treatment, dosing, or medication-use advice. It must not infer clinical facts that are not present in the OCR text. Human confirmation is required before routing a medication candidate into FAERS analysis.

## Fallback Behavior

If `DEEPSEEK_API_KEY` is absent, the app uses deterministic local extraction with the same schema. If DeepSeek returns invalid JSON or schema-invalid output, the API falls back to local extraction and returns a warning.

