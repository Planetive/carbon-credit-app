import { supabase } from "@/integrations/supabase/client";

export interface VehicleType {
  id: string;
  vehicle_type: string;
  co2_factor: number;
  unit: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Search vehicle types by name (case-insensitive, partial match)
 * @param searchTerm - Search term to match against vehicle types
 * @param limit - Maximum number of results to return (default: 20)
 * @returns Array of matching vehicle types
 */
export async function searchVehicleTypes(
  searchTerm: string,
  limit: number = 20
): Promise<VehicleType[]> {
  if (!searchTerm || searchTerm.trim().length === 0) {
    // If no search term, return all vehicle types
    try {
      const { data, error } = await supabase
        .from("Upstream Transportation and Distribution" as any)
        .select("*")
        .order("Vehicle Type", { ascending: true })
        .limit(limit);

      if (error) {
        console.error("Error fetching vehicle types:", error);
        return [];
      }

      return (data || []) as unknown as VehicleType[];
    } catch (error) {
      console.error("Error fetching vehicle types:", error);
      return [];
    }
  }

  const trimmedSearch = searchTerm.trim();

  try {
    const { data, error } = await supabase
      .from("Upstream Transportation and Distribution" as any)
      .select("*")
      .ilike("Vehicle Type", `%${trimmedSearch}%`)
      .order("Vehicle Type", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("Error searching vehicle types:", error);
      return [];
    }

    return (data || []) as unknown as VehicleType[];
  } catch (error) {
    console.error("Error searching vehicle types:", error);
    return [];
  }
}

/**
 * Get vehicle type by ID
 * @param id - Vehicle type ID
 * @returns Vehicle type or null if not found
 */
export async function getVehicleTypeById(id: string): Promise<VehicleType | null> {
  try {
    const { data, error } = await supabase
      .from("Upstream Transportation and Distribution" as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching vehicle type:", error);
      return null;
    }

    return data as unknown as VehicleType;
  } catch (error) {
    console.error("Error fetching vehicle type:", error);
    return null;
  }
}

/**
 * Get all vehicle types
 * @returns Array of all vehicle types
 */
export async function getAllVehicleTypes(): Promise<VehicleType[]> {
  try {
    console.log("Fetching vehicle types from: 'Upstream Transportation and Distribution'");
    
    // Use the exact table name from Supabase (space between "Upstream" and "Transportation")
    const result = await supabase
      .from("Upstream Transportation and Distribution" as any)
      .select("*")
      .order("Vehicle Type", { ascending: true });
    
    const data = result.data;
    const error = result.error;

    if (error) {
      console.error("Error fetching all vehicle types:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      // Check if it's an RLS error
      if (error.message?.includes("permission denied") || error.message?.includes("RLS")) {
        console.error("RLS (Row Level Security) might be blocking access. Check RLS policies.");
      }
      
      return [];
    }

    console.log("Fetched vehicle types data:", data);
    console.log("Number of vehicle types:", data?.length || 0);
    
    if (!data || data.length === 0) {
      console.warn("No data returned. Possible issues:");
      console.warn("1. Table might be empty");
      console.warn("2. RLS policies might be blocking access");
      console.warn("3. Table name might be incorrect");
      console.warn("4. User might not be authenticated");
      return [];
    }
    
    // Map the data to match our interface using exact column names from database
    const mappedData = (data || []).map((item: any, index: number) => {
      // Log first item to see structure
      if (index === 0) {
        console.log("Sample item structure:", item);
        console.log("Available keys:", Object.keys(item));
      }
      
      return {
        id: item.id || item.ID || item.Id || `vehicle-${index}`, // Use index as fallback if no id column
        vehicle_type: item["Vehicle Type"] || item["vehicle_type"] || item.vehicleType || item.vehicle_type,
        co2_factor: parseFloat(
          item["CO2 Factor (kg CO2 / unit)"]?.toString() || 
          item[" CO2 Factor (kg CO2 / unit) "]?.toString() || 
          item["CO2 Factor"]?.toString() || 
          item.co2_factor?.toString() || 
          "0"
        ),
        unit: item["Units"] || item["Unit"] || item.unit || item.units,
        created_at: item.created_at,
        updated_at: item.updated_at
      };
    });

    console.log("Mapped vehicle types:", mappedData);
    return mappedData as unknown as VehicleType[];
  } catch (error) {
    console.error("Exception fetching all vehicle types:", error);
    return [];
  }
}

