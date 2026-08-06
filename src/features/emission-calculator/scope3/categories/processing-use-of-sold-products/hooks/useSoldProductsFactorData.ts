import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { loadIpccFactorTableRows } from "@/integrations/supabase/ipccFactorLoader";
import type {
  HeatSteamRow,
  MobileCombustionRow,
  StationaryCombustionRow,
} from "../types";

function formatStationaryCombustionRows(data: any[]): StationaryCombustionRow[] {
  return (data || [])
    .map((row: any) => {
      const mainFuelType =
        row["Main Fuel Type"] ||
        row["main fuel type"] ||
        row.main_fuel_type ||
        row["main_fuel_type"] ||
        row["MainFuelType"] ||
        row.mainFuelType;
      const subFuelType =
        row["Sub FuelType"] ||
        row["Sub Fuel Type"] ||
        row["sub fueltype"] ||
        row["sub fuel type"] ||
        row.sub_fuel_type ||
        row["sub_fuel_type"] ||
        row["SubFuelType"] ||
        row.subFuelType;
      const co2Factor =
        row["CO2 Factor"] ||
        row["co2 factor"] ||
        row.co2_factor ||
        row["co2_factor"] ||
        row["CO2Factor"] ||
        row.co2Factor;
      const units =
        row["Units"] ||
        row["units"] ||
        row.units ||
        row.unit ||
        row["unit"] ||
        row.Unit;

      return {
        id: row.id || row.ID || row.Id,
        "Main Fuel Type": mainFuelType,
        "Sub Fuel Type": subFuelType,
        "CO2 Factor":
          typeof co2Factor === "number" ? co2Factor : parseFloat(co2Factor) || 0,
        Units: units,
      };
    })
    .filter((row) => row["Main Fuel Type"]);
}

function formatMobileCombustionRows(data: any[]): MobileCombustionRow[] {
  return (data || [])
    .map((row: any) => {
      const fuelType =
        row["Fuel Type"] ||
        row["FuelType"] ||
        row.fuel_type ||
        row["fuel_type"] ||
        row.fuelType ||
        row["fuelType"];
      const kgCo2PerUnit =
        row["kg CO2 per unit"] ||
        row["kg co2 per unit"] ||
        row.kg_co2_per_unit ||
        row["kg_co2_per_unit"] ||
        row.kgCo2PerUnit;
      const unit = row["Unit"] || row.unit || row["unit"] || row.Unit;

      return {
        id: row.id || row.ID || row.Id,
        FuelType: fuelType,
        "kg CO2 per unit":
          typeof kgCo2PerUnit === "number"
            ? kgCo2PerUnit
            : parseFloat(kgCo2PerUnit) || 0,
        Unit: unit,
      };
    })
    .filter((row) => row.FuelType && row.FuelType.trim() !== "");
}

function formatHeatSteamRows(data: any[]): HeatSteamRow[] {
  return (data || []).map((row: any) => ({
    id: row.id || row.ID || row.Id,
    Type: row["Type"] || row.type || row["type"] || row["Activity"] || row.activity,
    Unit: row["Unit"] || row.unit || row["unit"],
    "kg CO₂e":
      typeof row["kg CO₂e"] === "number"
        ? row["kg CO₂e"]
        : typeof row["kg CO2 / mmBtu"] === "number"
          ? row["kg CO2 / mmBtu"]
          : typeof row["kg CO2 / mmBtu"] === "string"
            ? parseFloat(row["kg CO2 / mmBtu"])
            : parseFloat(
                row["kg CO₂e"] ||
                  row["kg CO2e"] ||
                  row.kg_co2e ||
                  row["kg CO2 / mmBtu"] ||
                  0,
              ),
  }));
}

export function useSoldProductsFactorData() {
  const { toast } = useToast();
  const [stationaryCombustionData, setStationaryCombustionData] = useState<
    StationaryCombustionRow[]
  >([]);
  const [mobileCombustionData, setMobileCombustionData] = useState<
    MobileCombustionRow[]
  >([]);
  const [heatSteamDataUK, setHeatSteamDataUK] = useState<HeatSteamRow[]>([]);
  const [heatSteamDataEBT, setHeatSteamDataEBT] = useState<HeatSteamRow[]>([]);

  useEffect(() => {
    const loadCombustionData = async () => {
      try {
        const stationary = await loadIpccFactorTableRows([
          "Stationary Combustion",
          "stationary_combustion",
          "StationaryCombustion",
        ]);
        const stationaryRows = formatStationaryCombustionRows(stationary.rows);
        setStationaryCombustionData(stationaryRows);
        if (stationaryRows.length === 0) {
          toast({
            title: "Warning",
            description:
              stationary.attemptErrors[0] ||
              "Could not load Stationary Combustion factor data.",
            variant: "destructive",
          });
        }

        const mobile = await loadIpccFactorTableRows([
          "Mobile Combustion",
          "mobile_combustion",
          "MobileCombustion",
        ]);
        const mobileRows = formatMobileCombustionRows(mobile.rows);
        setMobileCombustionData(mobileRows);
        if (mobileRows.length === 0) {
          toast({
            title: "Warning",
            description:
              mobile.attemptErrors[0] ||
              "Could not load Mobile Combustion factor data.",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: `Failed to load combustion data: ${error.message || "Unknown error"}`,
          variant: "destructive",
        });
      }
    };

    loadCombustionData();
  }, [toast]);

  useEffect(() => {
    const loadHeatSteamData = async () => {
      try {
        const uk = await loadIpccFactorTableRows([
          "heat and steam",
          "heat_and_steam",
        ]);
        if (uk.rows.length > 0) {
          setHeatSteamDataUK(formatHeatSteamRows(uk.rows));
        }
      } catch (error: any) {
        console.error("Error loading UK heat and steam data:", error);
      }

      try {
        const ebt = await loadIpccFactorTableRows([
          "heat and steam EBT",
          "heat_and_steam_ebt",
        ]);
        if (ebt.rows.length > 0) {
          setHeatSteamDataEBT(formatHeatSteamRows(ebt.rows));
        }
      } catch (error: any) {
        console.error("Error loading EBT heat and steam data:", error);
      }
    };

    loadHeatSteamData();
  }, []);

  return {
    stationaryCombustionData,
    mobileCombustionData,
    heatSteamDataUK,
    heatSteamDataEBT,
  };
}
