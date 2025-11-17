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
    console.log("📦 Fetching all business travel types from: business travel table");
    
    const { data, error } = await supabase
      .from("business travel" as any)
      .select("*")
      .order("Vehicle Type", { ascending: true });

    if (error) {
      console.error("❌ Error fetching all business travel types:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      // Try alternative table name format
      if (error.message?.includes("column") || error.message?.includes("does not exist")) {
        console.log("⚠️ Trying alternative column name format...");
        const { data: data2, error: error2 } = await supabase
          .from("business travel" as any)
          .select("*")
          .order("vehicle_type", { ascending: true });
        
        if (!error2 && data2) {
          console.log("✅ Success with alternative column name");
          return mapBusinessTravelData(data2);
        }
      }
      
      return [];
    }

    console.log("✅ Fetched business travel types data:", data?.length || 0, "items");
    
    if (data && data.length > 0) {
      console.log("📋 Sample item structure:", data[0]);
      console.log("📋 Available keys:", Object.keys(data[0]));
      console.log("📋 Full sample item (for debugging):", JSON.stringify(data[0], null, 2));
      
      // Try to find CO2 Factor column
      const sampleItem = data[0];
      const possibleCo2Columns = Object.keys(sampleItem).filter(key => 
        key.toLowerCase().includes('co2') || 
        key.toLowerCase().includes('factor') ||
        key.toLowerCase().includes('emission')
      );
      console.log("🔍 Possible CO2 Factor columns found:", possibleCo2Columns);
      if (possibleCo2Columns.length > 0) {
        possibleCo2Columns.forEach(col => {
          console.log(`  - "${col}":`, sampleItem[col], `(type: ${typeof sampleItem[col]})`);
        });
      }
    } else {
      console.warn("⚠️ No data returned. Possible issues:");
      console.warn("1. Table might be empty");
      console.warn("2. RLS policies might be blocking access");
      console.warn("3. Table name might be incorrect");
    }

    return mapBusinessTravelData(data || []);
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
    const co2FactorValue = item["CO2 Factor \n(kg CO2 / unit)"] || item["CO2 Factor (kg CO2 / unit)"];
    
    // Handle different data types
    let co2Factor = 0;
    if (co2FactorValue !== null && co2FactorValue !== undefined && co2FactorValue !== '') {
      if (typeof co2FactorValue === 'number') {
        co2Factor = co2FactorValue;
      } else if (typeof co2FactorValue === 'string') {
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
      updated_at: item.updated_at
    };
  });
}

