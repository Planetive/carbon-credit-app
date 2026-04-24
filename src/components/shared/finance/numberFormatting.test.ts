import { describe, expect, it } from "vitest";
import { formatNumberWithCommas, handleFormattedNumberChange, parseFormattedNumber } from "./numberFormatting";

describe("numberFormatting", () => {
  it("formats numeric values with commas", () => {
    expect(formatNumberWithCommas(10000)).toBe("10,000");
  });

  it("parses formatted values", () => {
    expect(parseFormattedNumber("12,345.5")).toBe(12345.5);
  });

  it("normalizes input before emitting onChange", () => {
    let emitted = 0;
    handleFormattedNumberChange("1,234.50", (next) => {
      emitted = next;
    });
    expect(emitted).toBe(1234.5);
  });
});
