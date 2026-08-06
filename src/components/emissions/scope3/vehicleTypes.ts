import { supabase } from "@/integrations/supabase/client";
import { tryLoadFactorSheetViaApi } from "@/api/factorDualRead";

export interface VehicleType {
  id: string;
  vehicle_type: string;
  co2_factor: number;
  unit: string;
  created_at?: string;
  updated_at?: string;
}

const TABLE = "Upstream Transportation and Distribution";

let cache: VehicleType[] | null = null;
let cachePromise: Promise<VehicleType[]> | null = null;

function mapVehicleRows(data: Record<string, unknown>[]): VehicleType[] {
  return data.map((item, index) => ({
    id: String(item.id || item.ID || item.Id || `vehicle-${index}`),
    vehicle_type: String(
      item["Vehicle Type"] ||
        item["vehicle_type"] ||
        item.vehicleType ||
        item.vehicle_type ||
        ""
    ),
    co2_factor: parseFloat(
      String(
        item["CO2 Factor (kg CO2 / unit)"] ??
          item[" CO2 Factor (kg CO2 / unit) "] ??
          item["CO2 Factor"] ??
          item.co2_factor ??
          "0"
      )
    ),
    unit: String(item["Units"] || item["Unit"] || item.unit || item.units || ""),
    created_at: item.created_at as string | undefined,
    updated_at: item.updated_at as string | undefined,
  }));
}

async function loadAllVehicleTypes(): Promise<VehicleType[]> {
  if (cache) return cache;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    const apiRows = await tryLoadFactorSheetViaApi({
      datasetCodes: [
        "upstream_transportation_and_distribution",
        "upstream_transportation",
      ],
      nameHints: [
        "Upstream Transportation and Distribution",
        "upstream transportation",
      ],
    });
    if (apiRows && apiRows.length > 0) {
      cache = mapVehicleRows(apiRows);
      return cache;
    }

    const result = await supabase.from(TABLE as any).select("*").order("Vehicle Type", {
      ascending: true,
    });
    if (result.error) {
      console.error("Error fetching all vehicle types:", result.error);
      return [];
    }
    cache = mapVehicleRows((result.data || []) as Record<string, unknown>[]);
    return cache;
  })();

  try {
    return await cachePromise;
  } finally {
    cachePromise = null;
  }
}

export async function searchVehicleTypes(
  searchTerm: string,
  limit: number = 20
): Promise<VehicleType[]> {
  const all = await loadAllVehicleTypes();
  if (!searchTerm || searchTerm.trim().length === 0) {
    return all.slice(0, limit);
  }
  const q = searchTerm.trim().toLowerCase();
  return all
    .filter((v) => v.vehicle_type.toLowerCase().includes(q))
    .slice(0, limit);
}

export async function getVehicleTypeById(id: string): Promise<VehicleType | null> {
  const all = await loadAllVehicleTypes();
  return all.find((v) => String(v.id) === String(id)) || null;
}

export async function getAllVehicleTypes(): Promise<VehicleType[]> {
  return loadAllVehicleTypes();
}
