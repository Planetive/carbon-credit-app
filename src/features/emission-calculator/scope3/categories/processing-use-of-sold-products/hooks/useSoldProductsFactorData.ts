import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type {
  HeatSteamRow,
  MobileCombustionRow,
  StationaryCombustionRow,
} from "../types";

async function queryFirstAvailableTable(tableNames: string[]) {
  let result = await supabase.from(tableNames[0] as any).select("*", { count: "exact" });

  for (let index = 1; result.error && index < tableNames.length; index += 1) {
    result = await supabase
      .from(tableNames[index] as any)
      .select("*", { count: "exact" });
  }

  return result;
}

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
        const stationaryResult = await queryFirstAvailableTable([
          "Stationary Combustion",
          '"Stationary Combustion"',
          "stationary_combustion",
          "StationaryCombustion",
        ]);

        if (!stationaryResult.error && (!stationaryResult.data || stationaryResult.data.length === 0)) {
          const countResult = await supabase
            .from("Stationary Combustion" as any)
            .select("*", { count: "exact", head: true });

          if (countResult.count !== null && countResult.count > 0) {
            toast({
              title: "RLS Policy Issue",
              description: `Table has ${countResult.count} rows but RLS is blocking access. Please check Supabase RLS policies for "Stationary Combustion" table.`,
              variant: "destructive",
            });
          } else if (countResult.count === 0) {
            toast({
              title: "Empty Table",
              description:
                "The Stationary Combustion table is empty. Please add data to the table.",
              variant: "default",
            });
          }
        }

        if (stationaryResult.error) {
          toast({
            title: "Warning",
            description: `Could not load Stationary Combustion data: ${stationaryResult.error.message || "Unknown error"}. Check if table has data and RLS policies.`,
            variant: "destructive",
          });
        }

        setStationaryCombustionData(
          formatStationaryCombustionRows(stationaryResult.data || []),
        );

        const mobileResult = await queryFirstAvailableTable([
          "Mobile Combustion",
          '"Mobile Combustion"',
          "mobile_combustion",
          "MobileCombustion",
        ]);

        if (!mobileResult.error && (!mobileResult.data || mobileResult.data.length === 0)) {
          if (mobileResult.count === 0) {
            toast({
              title: "Empty Table",
              description:
                'The Mobile Combustion table is empty. Please add at least one row with data in Supabase.',
              variant: "default",
            });
          } else if (mobileResult.count !== null && mobileResult.count > 0) {
            toast({
              title: "Data Access Issue",
              description: `Table has ${mobileResult.count} rows but cannot retrieve them. Check table permissions.`,
              variant: "destructive",
            });
          }
        }

        if (mobileResult.error) {
          toast({
            title: "Warning",
            description: `Could not load Mobile Combustion data: ${mobileResult.error.message || "Unknown error"}. Check if table has data and RLS policies.`,
            variant: "destructive",
          });
        }

        setMobileCombustionData(formatMobileCombustionRows(mobileResult.data || []));
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
        const { data: ukData, error: ukError } = await supabase
          .from("heat and steam" as any)
          .select("*", { count: "exact" });

        if (ukError) {
          console.error("Heat and Steam (UK) error:", ukError);
        } else if (ukData && ukData.length > 0) {
          setHeatSteamDataUK(formatHeatSteamRows(ukData));
        }
      } catch (error: any) {
        console.error("Error loading UK heat and steam data:", error);
      }

      try {
        const { data: ebtData, error: ebtError } = await supabase
          .from("heat and steam EBT" as any)
          .select("*", { count: "exact" });

        if (ebtError) {
          console.error("Heat and Steam (EBT) error:", ebtError);
        } else if (ebtData && ebtData.length > 0) {
          setHeatSteamDataEBT(formatHeatSteamRows(ebtData));
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
