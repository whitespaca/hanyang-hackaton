import { describe, expect, it } from "vitest";
import { classificationResponseSchema, formatConfidence, isLowConfidence } from "../src";

describe("shared contract", () => {
  it("formats and compares confidence", () => {
    expect(formatConfidence(0.7812)).toBe("78%");
    expect(isLowConfidence(0.64, 0.65)).toBe(true);
  });

  it("rejects invalid predictions", () => {
    const result = classificationResponseSchema.safeParse({
      classificationId: crypto.randomUUID(),
      predictions: [{ className: "unknown", labelKo: "?", confidence: 2 }],
      needsConfirmation: true,
      confidenceThreshold: 0.65,
      model: { name: "mock", version: "1", inferenceMode: "mock" },
    });
    expect(result.success).toBe(false);
  });
});
