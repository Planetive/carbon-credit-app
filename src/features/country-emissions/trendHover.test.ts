import { describe, expect, it } from "vitest";
import { pickNearestHoverPoint, type TrendHoverPoint } from "./trendHover";

const points: TrendHoverPoint[] = [
  { x: 100, y: 100, sector: "Energy", value: 10, label: "2020", color: "#000" },
  { x: 200, y: 100, sector: "Transport", value: 8, label: "2020", color: "#111" },
];

describe("pickNearestHoverPoint", () => {
  it("returns nearest point within radius", () => {
    const nearest = pickNearestHoverPoint(points, 106, 98, 12);
    expect(nearest?.sector).toBe("Energy");
  });

  it("returns null when pointer is outside radius", () => {
    const nearest = pickNearestHoverPoint(points, 10, 10, 12);
    expect(nearest).toBeNull();
  });
});
