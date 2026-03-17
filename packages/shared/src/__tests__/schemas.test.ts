import { describe, it, expect } from "vitest";
import {
  UnifiedCaseSchema,
  DEFAULT_SCORING_WEIGHTS,
  CaseSource,
  CaseType,
  CaseStatus,
} from "../schemas.js";

describe("schemas", () => {
  it("exports all case source values", () => {
    expect(CaseSource.options).toContain("ftc");
    expect(CaseSource.options).toContain("eeoc");
    expect(CaseSource.options).toContain("courtlistener");
    expect(CaseSource.options).toContain("sec");
    expect(CaseSource.options).toContain("pacer");
    expect(CaseSource.options).toContain("classactionorg");
  });

  it("exports all case type values", () => {
    expect(CaseType.options).toContain("consumer");
    expect(CaseType.options).toContain("securities");
    expect(CaseType.options).toContain("employment");
    expect(CaseType.options).toContain("privacy");
  });

  it("exports all case status values", () => {
    expect(CaseStatus.options).toContain("filed");
    expect(CaseStatus.options).toContain("claims_open");
    expect(CaseStatus.options).toContain("settled");
  });

  it("DEFAULT_SCORING_WEIGHTS values sum to expected range", () => {
    const w = DEFAULT_SCORING_WEIGHTS;
    expect(w).toBeDefined();
    expect(typeof w.sourceConfidence).toBe("number");
    expect(typeof w.estimatedPayoutWeight).toBe("number");
    expect(typeof w.deadlineUrgency).toBe("number");
    const sum = Object.values(w).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 2);
  });

  it("validates a minimal UnifiedCase", () => {
    const minimal = {
      case_id: "test-001",
      source: "ftc",
      case_name: "Test Case",
      case_type: "consumer",
      status: "filed",
      defendants: ["Test Corp"],
    };

    const result = UnifiedCaseSchema.safeParse(minimal);
    expect(result.success).toBe(true);
  });

  it("rejects invalid case source", () => {
    const invalid = {
      case_id: "test-001",
      source: "invalid_source",
      case_name: "Test Case",
      case_type: "consumer",
      status: "filed",
      defendants: [],
    };

    const result = UnifiedCaseSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
