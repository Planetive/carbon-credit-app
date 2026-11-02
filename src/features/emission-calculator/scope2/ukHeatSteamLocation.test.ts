import { describe, expect, it } from "vitest";
import {
  canonicalHeatSteamCountry,
  heatSteamCountryOptions,
  missingHeatSteamCountryMessage,
  resolveHeatSteamLocation,
} from "./ukHeatSteamLocation";

describe("UK purchased heat location", () => {
  it("does not assume the United Kingdom when location is missing or unreliable", () => {
    expect(canonicalHeatSteamCountry("")).toBeNull();
    expect(canonicalHeatSteamCountry("N/A")).toBeNull();
    expect(canonicalHeatSteamCountry("Global")).toBeNull();
    expect(canonicalHeatSteamCountry("Europe")).toBeNull();
    expect(resolveHeatSteamLocation({}).status).toBe("unavailable");
    expect(resolveHeatSteamLocation({ counterpartyGeography: "Unknown" }).status).toBe("unavailable");
  });

  it("accepts reliable country names and aliases without inventing a factor", () => {
    expect(canonicalHeatSteamCountry("UK")).toBe("United Kingdom");
    expect(canonicalHeatSteamCountry("United Kingdom")).toBe("United Kingdom");
    expect(canonicalHeatSteamCountry("London, United Kingdom")).toBe("United Kingdom");
    expect(canonicalHeatSteamCountry("Pakistan")).toBe("Pakistan");
    expect(canonicalHeatSteamCountry("UAE")).toBe("United Arab Emirates");
    expect(canonicalHeatSteamCountry("France")).toBe("France");
  });

  it("prefers facility, then counterparty geography, then organization country", () => {
    expect(
      resolveHeatSteamLocation({
        facilityCountry: "France",
        counterpartyGeography: "United Kingdom",
        organizationCountry: "Pakistan",
      })
    ).toEqual({ status: "resolved", country: "France", source: "facility_country" });
    expect(
      resolveHeatSteamLocation({
        counterpartyGeography: "PK",
        organizationCountry: "United Kingdom",
      })
    ).toEqual({ status: "resolved", country: "Pakistan", source: "counterparty_geography" });
    expect(resolveHeatSteamLocation({ organizationCountry: "Germany" })).toEqual({
      status: "resolved",
      country: "Germany",
      source: "organization_country",
    });
  });

  it("offers a controlled country list that includes the United Kingdom and does not default to it", () => {
    const options = heatSteamCountryOptions();
    expect(options).toContain("United Kingdom");
    expect(options).toContain("Pakistan");
    expect(options[0]).not.toBe("United Kingdom");
    expect(missingHeatSteamCountryMessage()).toMatch(/not applied automatically/i);
  });
});
