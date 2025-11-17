import { supabase } from "@/integrations/supabase/client";

export interface WasteMaterial {
  id: string;
  " Material ": string; // Column name has leading and trailing spaces
  Recycled?: number | string; // Can be number or "N/A"
  Landfilled?: number | string;
  Combusted?: number | string;
  Composted?: number | string;
  "Anaerobically Digested (Dry Digestate with Curing)"?: number | string;
  "Anaerobically Digested (Wet Digestate with Curing)"?: number | string;
  created_at?: string;
  updated_at?: string;
}

export type DisposalMethod = 
  | "Recycled"
  | "Landfilled"
  | "Combusted"
  | "Composted"
  | "Anaerobically Digested (Dry Digestate with Curing)"
  | "Anaerobically Digested (Wet Digestate with Curing)";

/**
 * Search waste materials by Material name (case-insensitive, partial match)
 * @param searchTerm - Search term to match against material names
 * @param limit - Maximum number of results to return (default: 20)
 * @returns Array of matching waste materials
 */
export async function searchWasteMaterials(
  searchTerm: string,
  limit: number = 20
): Promise<WasteMaterial[]> {
  try {
    console.log("🔍 Searching waste materials. Search term:", searchTerm);
    
    // First, try to get ALL data to see what we're working with
    const { data: allData, error: allError } = await supabase
      .from("waste" as any)
      .select("*")
      .limit(5);
    
    console.log("📊 Test query - All data (first 5):", allData?.length || 0, "items");
    if (allData && allData.length > 0) {
      console.log("📋 Sample row:", allData[0]);
      console.log("📋 Column names in data:", Object.keys(allData[0]));
      console.log("📋 Material value:", allData[0][" Material "] || allData[0]["Material"] || allData[0].Material);
    }
    if (allError) {
      console.error("❌ Error fetching all data:", allError);
    }
    
    let query = supabase
      .from("waste" as any)
      .select("*");
    
    // If search term provided, filter by Material column
    if (searchTerm && searchTerm.trim().length > 0) {
      const trimmedSearch = searchTerm.trim();
      console.log("🔍 Applying search filter for:", trimmedSearch);
      
      // Try with spaces first
      try {
        query = query.ilike(" Material ", `%${trimmedSearch}%`);
      } catch (e) {
        console.log("⚠️ Error with ' Material ' column, trying 'Material'");
        query = query.ilike("Material", `%${trimmedSearch}%`);
      }
    }
    
    // Try ordering - if it fails, skip ordering
    try {
      query = query.order(" Material ", { ascending: true });
    } catch (e) {
      console.log("⚠️ Error ordering by ' Material ', trying 'Material'");
      try {
        query = query.order("Material", { ascending: true });
      } catch (e2) {
        console.log("⚠️ Skipping order clause");
      }
    }
    
    query = query.limit(limit);
    
    const { data, error } = await query;

    if (error) {
      console.error("❌ Error searching waste materials:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      // Check if it's a column name issue
      if (error.message?.includes("column") || error.message?.includes("does not exist")) {
        console.error("⚠️ Possible column name mismatch. Trying alternative column names...");
        
        // Try without spaces
        const { data: data2, error: error2 } = await supabase
          .from("waste" as any)
          .select("*")
          .ilike("Material", `%${searchTerm.trim()}%`)
          .order("Material", { ascending: true })
          .limit(limit);
        
        if (!error2 && data2 && data2.length > 0) {
          console.log("✅ Success with 'Material' (no spaces)");
          return mapWasteData(data2);
        }
        
        // If still no results, try getting all and filtering in JavaScript
        console.log("⚠️ Trying to fetch all and filter client-side...");
        const { data: allData2 } = await supabase
          .from("waste" as any)
          .select("*")
          .limit(100);
        
        if (allData2 && allData2.length > 0) {
          const filtered = allData2.filter((item: any) => {
            const material = item[" Material "] || item["Material"] || item.Material || "";
            return material.toLowerCase().includes(searchTerm.trim().toLowerCase());
          });
          console.log("✅ Client-side filter found:", filtered.length, "items");
          return mapWasteData(filtered);
        }
      }
      
      return [];
    }

    console.log("✅ Fetched waste materials:", data?.length || 0, "items");
    if (data && data.length > 0) {
      console.log("📋 Sample item:", data[0]);
      console.log("📋 Available keys:", Object.keys(data[0]));
      console.log("📋 Material value in result:", data[0][" Material "] || data[0]["Material"] || data[0].Material);
    } else {
      console.warn("⚠️ Query succeeded but returned 0 items. Trying to fetch all data...");
      // Try fetching all data without filter
      const { data: allData3 } = await supabase
        .from("waste" as any)
        .select("*")
        .limit(10);
      
      console.log("📊 All data (no filter):", allData3?.length || 0, "items");
      if (allData3 && allData3.length > 0) {
        console.log("📋 First item:", allData3[0]);
        console.log("📋 All keys:", Object.keys(allData3[0]));
      }
    }

    return mapWasteData(data || []);
  } catch (error) {
    console.error("❌ Exception searching waste materials:", error);
    return [];
  }
}

// Helper function to map waste data with different column name formats
function mapWasteData(data: any[]): WasteMaterial[] {
  return data.map((item: any, index: number) => {
    // Try multiple column name formats
    const material = item[" Material "] || item["Material"] || item.Material || item[" material "] || "";
    
    return {
      id: item.id || `waste-${index}`,
      " Material ": material,
      Recycled: item.Recycled,
      Landfilled: item.Landfilled,
      Combusted: item.Combusted,
      Composted: item.Composted,
      "Anaerobically Digested (Dry Digestate with Curing)": item["Anaerobically Digested (Dry Digestate with Curing)"],
      "Anaerobically Digested (Wet Digestate with Curing)": item["Anaerobically Digested (Wet Digestate with Curing)"],
      created_at: item.created_at,
      updated_at: item.updated_at
    };
  });
}

/**
 * Get all waste materials
 * @returns Array of all waste materials
 */
export async function getAllWasteMaterials(): Promise<WasteMaterial[]> {
  try {
    console.log("📦 Fetching all waste materials from: waste table");
    
    const { data, error } = await supabase
      .from("waste" as any)
      .select("*")
      .order(" Material ", { ascending: true });

    if (error) {
      console.error("❌ Error fetching all waste materials:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      // Try alternative column name
      if (error.message?.includes("column") || error.message?.includes("does not exist")) {
        console.log("⚠️ Trying alternative column name 'Material' (no spaces)...");
        const { data: data2, error: error2 } = await supabase
          .from("waste" as any)
          .select("*")
          .order("Material", { ascending: true });
        
        if (!error2 && data2) {
          console.log("✅ Success with 'Material' (no spaces)");
          return mapWasteData(data2);
        }
      }
      
      return [];
    }

    console.log("✅ Fetched waste materials data:", data?.length || 0, "items");
    
    if (data && data.length > 0) {
      console.log("📋 Sample item structure:", data[0]);
      console.log("📋 Available keys:", Object.keys(data[0]));
    } else {
      console.warn("⚠️ No data returned. Possible issues:");
      console.warn("1. Table might be empty");
      console.warn("2. RLS policies might be blocking access");
      console.warn("3. Table name might be incorrect");
    }

    return mapWasteData(data || []);
  } catch (error) {
    console.error("❌ Exception fetching all waste materials:", error);
    return [];
  }
}

/**
 * Get waste material by ID
 * @param id - Material ID
 * @returns Waste material or null if not found
 */
export async function getWasteMaterialById(id: string): Promise<WasteMaterial | null> {
  try {
    const { data, error } = await supabase
      .from("waste" as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching waste material:", error);
      return null;
    }

    return data as unknown as WasteMaterial;
  } catch (error) {
    console.error("Error fetching waste material:", error);
    return null;
  }
}

/**
 * Get available disposal methods for a material (exclude N/A)
 * @param material - Waste material
 * @returns Array of disposal methods that are available (not N/A)
 */
export function getAvailableDisposalMethods(material: WasteMaterial | null): DisposalMethod[] {
  if (!material) return [];

  const allMethods: DisposalMethod[] = [
    "Recycled",
    "Landfilled",
    "Combusted",
    "Composted",
    "Anaerobically Digested (Dry Digestate with Curing)",
    "Anaerobically Digested (Wet Digestate with Curing)"
  ];

  return allMethods.filter(method => {
    const value = material[method as keyof WasteMaterial];
    // Check if value exists and is not N/A (case-insensitive)
    return value !== null && value !== undefined && 
           value !== "N/A" && value !== "n/a" && value !== "na" && value !== "NA";
  });
}

/**
 * Get emission factor for a material and disposal method
 * @param material - Waste material
 * @param disposalMethod - Disposal method
 * @returns Emission factor as number, or null if N/A
 */
export function getEmissionFactor(
  material: WasteMaterial | null,
  disposalMethod: DisposalMethod
): number | null {
  if (!material) return null;

  const value = material[disposalMethod as keyof WasteMaterial];
  
  // Check if value is N/A
  if (value === null || value === undefined || 
      value === "N/A" || value === "n/a" || value === "na" || value === "NA") {
    return null;
  }

  // Convert to number
  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(numValue) ? null : numValue;
}

