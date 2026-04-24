import { describe, expect, it } from "vitest";
import { getIPCCCategoryDescription, getIPCCCategoryTitle } from "./categoryMeta";

describe("ipcc category meta", () => {
  it("resolves category title using map", () => {
    expect(getIPCCCategoryTitle("roadTransport")).toBe("Scope 3 - Road Transport");
  });

  it("falls back to scope 2 title", () => {
    expect(getIPCCCategoryTitle("unknownCategory")).toBe("Scope 2 - Industry Emissions");
  });

  it("injects industry into fallback description", () => {
    expect(getIPCCCategoryDescription("unknownCategory", "Cement")).toContain("Cement");
  });
});
