import { describe, expect, it } from "vitest";
import type { EmissionActivity } from "@/api/ghg";
import { collectVerifiedTonnes, ukAnnualScope2Kg, ukStoredTonnes } from "./ukScope2Results";

function activity(overrides: Partial<EmissionActivity>): EmissionActivity {
  return {
    id: "activity-1",
    assessment_id: "assessment-1",
    organization_id: "org-1",
    user_id: "user-1",
    scope: 2,
    category: "purchased_electricity",
    method: "location_based",
    emissions_tco2e: 0.177,
    legacy_source: "scope2_uk_location_electricity_v1",
    raw: { accounting: { version: "scope2_uk_location_electricity_v1" } },
    ...overrides,
  };
}

describe("UK annual Scope 2", () => {
  it("converts stored tonnes to kilograms and leaves legacy kilograms out", () => {
    expect(ukAnnualScope2Kg(["0.17700000"], [])).toBe(177);
    expect(ukAnnualScope2Kg([], ["0.00175290"])).toBeCloseTo(1.7529, 8);
    const verified = ukAnnualScope2Kg(["0.17700000"], ["0.00175290"]);
    expect(verified).toBeCloseTo(178.7529, 4);
    expect(verified).not.toBeCloseTo(178.7529 + 15000, 1);
  });

  it("counts each verified activity once and ignores an EPA record", () => {
    const tonnes = collectVerifiedTonnes(
      [
        { id: "elec", tonnes: "0.17700000" },
        { id: "elec", tonnes: "0.17700000" },
        { id: "heat", tonnes: "0.00175290" },
      ],
      (row) => row.tonnes,
    );
    expect(ukAnnualScope2Kg(tonnes, [])).toBeCloseTo(178.7529, 4);
    expect(
      ukStoredTonnes(
        activity({ legacy_source: "scope2_location_electricity_v1", raw: { accounting: { version: "scope2_location_electricity_v1" } } }),
        "scope2_uk_location_electricity_v1",
        "purchased_electricity",
      ),
    ).toBeNull();
    expect(ukStoredTonnes(activity({ emissions_tco2e: "0.17700000" as unknown as number }), "scope2_uk_location_electricity_v1", "purchased_electricity")).toBe(
      "0.17700000",
    );
  });
});
