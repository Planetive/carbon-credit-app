import { loadIpccFactorTableRows } from "@/integrations/supabase/ipccFactorLoader";
import { supabase } from "@/integrations/supabase/client";

export interface BusinessTravelType {
  id: string;
  vehicle_type: string;
  co2_factor: number;
  unit: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Get all business travel vehicle types from the database
 * @returns Array of all business travel vehicle types
 */
export async function getAllBusinessTravelTypes(): Promise<BusinessTravelType[]> {
  try {
    console.log("📦 Fetching all business travel types (API dual-read / Supabase fallback)");

    const { rows } = await loadIpccFactorTableRows([
      "business travel",
      "business_travel",
    ]);

    if (rows.length > 0) {
      console.log("✅ Fetched business travel types data:", rows.length, "items");
      console.log("📋 Sample item structure:", rows[0]);
      console.log("📋 Available keys:", Object.keys(rows[0]));
      return mapBusinessTravelData(rows);
    }

    console.warn("⚠️ No business travel factor rows from API or Supabase");
    return [];
  } catch (error) {
    console.error("❌ Exception fetching all business travel types:", error);
    return [];
  }
}

/**
 * Get a business travel type by ID
 * @param id - The ID of the business travel type
 * @returns The business travel type or null if not found
 */
export async function getBusinessTravelTypeById(id: string): Promise<BusinessTravelType | null> {
  try {
    const all = await getAllBusinessTravelTypes();
    const hit = all.find((t) => t.id === id);
    if (hit) return hit;

    const { data, error } = await supabase
      .from("business travel" as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching business travel type:", error);
      return null;
    }

    return mapBusinessTravelData([data])[0] || null;
  } catch (error) {
    console.error("Error fetching business travel type:", error);
    return null;
  }
}

/**
 * Map database data to BusinessTravelType interface
 * Handles different column name formats
 */
function mapBusinessTravelData(data: any[]): BusinessTravelType[] {
  return data.map((item: any, index: number) => {
    // The actual column name has a newline character: "CO2 Factor \n(kg CO2 / unit)"
    // Try both with and without newline
    const co2FactorValue =
      item["CO2 Factor \n(kg CO2 / unit)"] ||
      item["CO2 Factor (kg CO2 / unit)"] ||
      item.co2_factor ||
      item["co2_factor"];

    // Handle different data types
    let co2Factor = 0;
    if (co2FactorValue !== null && co2FactorValue !== undefined && co2FactorValue !== "") {
      if (typeof co2FactorValue === "number") {
        co2Factor = co2FactorValue;
      } else if (typeof co2FactorValue === "string") {
        const parsed = parseFloat(co2FactorValue);
        co2Factor = isNaN(parsed) ? 0 : parsed;
      } else {
        co2Factor = parseFloat(String(co2FactorValue)) || 0;
      }
    }

    // Debug logging for first item
    if (index === 0) {
      console.log("🔍 Mapping Business Travel Data - Sample Item:");
      console.log("CO2 Factor value found:", co2FactorValue);
      console.log("Parsed CO2 Factor:", co2Factor);
    }

    return {
      id: item.id || `business-travel-${index}`,
      vehicle_type: item["Vehicle Type"] || item.vehicle_type || item.vehicleType || "",
      co2_factor: co2Factor,
      unit: item["Units"] || item["Unit"] || item.unit || item.units || "",
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  });
}
