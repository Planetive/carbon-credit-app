import { describe, expect, it } from "vitest";
import { toGallons, toMiles, round6, AR5_GWP100 } from "./units";

describe("units", () => {
  it("converts liters to gallons", () => {
    expect(toGallons(3.78541, "liters")).toBeCloseTo(1, 5);
    expect(toGallons(10, "gallon")).toBe(10);
  });

  it("converts km to miles", () => {
    expect(toMiles(1.609344, "km")).toBeCloseTo(1, 3);
    expect(toMiles(100, "miles")).toBe(100);
  });

  it("documents AR5 GWP constants used for gas assembly", () => {
    expect(AR5_GWP100.CH4).toBe(28);
    expect(AR5_GWP100.N2O).toBe(265);
    expect(round6(1.2345678)).toBe(1.234568);
  });
});
