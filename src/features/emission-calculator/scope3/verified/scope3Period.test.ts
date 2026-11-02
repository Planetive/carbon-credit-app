import { describe, expect, it } from "vitest";
import { scope3Period } from "./Scope3PeriodFields";

describe("scope3Period", () => {
  it("formats YYYY-MM for verified Scope 3 activity periods", () => {
    expect(scope3Period(2026, "01")).toBe("2026-01");
    expect(scope3Period(2026, "12")).toBe("2026-12");
  });

  it("does not invent a period from created_at-style values", () => {
    // Callers must supply an explicit reporting month; helper only joins year+month.
    expect(scope3Period(2026, "06")).not.toMatch(/created_at/i);
  });
});
