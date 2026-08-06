import { supabase } from "@/integrations/supabase/client";
import { tryLoadFactorSheetViaApi } from "@/api/factorDualRead";

export interface WasteMaterial {
  id: string;
  " Material ": string;
  Recycled?: number | string;
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

let cache: WasteMaterial[] | null = null;
let cachePromise: Promise<WasteMaterial[]> | null = null;

function mapWasteData(data: any[]): WasteMaterial[] {
  return data.map((item: any, index: number) => {
    const material =
      item[" Material "] ||
      item["Material"] ||
      item.Material ||
      item[" material "] ||
      item.material ||
      "";

    return {
      id: item.id || `waste-${index}`,
      " Material ": material,
      Recycled: item.Recycled ?? item.recycled,
      Landfilled: item.Landfilled ?? item.landfilled,
      Combusted: item.Combusted ?? item.combusted,
      Composted: item.Composted ?? item.composted,
      "Anaerobically Digested (Dry Digestate with Curing)":
        item["Anaerobically Digested (Dry Digestate with Curing)"],
      "Anaerobically Digested (Wet Digestate with Curing)":
        item["Anaerobically Digested (Wet Digestate with Curing)"],
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  });
}

function materialName(m: WasteMaterial): string {
  return String(m[" Material "] || "").trim();
}

async function loadAllWasteMaterials(): Promise<WasteMaterial[]> {
  if (cache) return cache;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    const apiRows = await tryLoadFactorSheetViaApi({
      datasetCodes: ["waste"],
      nameHints: ["waste"],
    });
    if (apiRows && apiRows.length > 0) {
      cache = mapWasteData(apiRows);
      return cache;
    }

    let { data, error } = await supabase
      .from("waste" as any)
      .select("*")
      .order(" Material ", { ascending: true });

    if (error) {
      const alt = await supabase
        .from("waste" as any)
        .select("*")
        .order("Material", { ascending: true });
      data = alt.data;
      error = alt.error;
    }

    if (error) {
      console.error("Error fetching waste materials:", error);
      return [];
    }

    cache = mapWasteData(data || []);
    return cache;
  })();

  try {
    return await cachePromise;
  } finally {
    cachePromise = null;
  }
}

export async function searchWasteMaterials(
  searchTerm: string,
  limit: number = 20
): Promise<WasteMaterial[]> {
  const all = await loadAllWasteMaterials();
  if (!searchTerm || searchTerm.trim().length === 0) {
    return all.slice(0, limit);
  }
  const q = searchTerm.trim().toLowerCase();
  return all.filter((m) => materialName(m).toLowerCase().includes(q)).slice(0, limit);
}

export async function getAllWasteMaterials(): Promise<WasteMaterial[]> {
  return loadAllWasteMaterials();
}

export async function getWasteMaterialById(id: string): Promise<WasteMaterial | null> {
  const all = await loadAllWasteMaterials();
  return all.find((m) => String(m.id) === String(id)) || null;
}

export function getAvailableDisposalMethods(material: WasteMaterial | null): DisposalMethod[] {
  if (!material) return [];

  const allMethods: DisposalMethod[] = [
    "Recycled",
    "Landfilled",
    "Combusted",
    "Composted",
    "Anaerobically Digested (Dry Digestate with Curing)",
    "Anaerobically Digested (Wet Digestate with Curing)",
  ];

  return allMethods.filter((method) => {
    const value = material[method as keyof WasteMaterial];
    return (
      value !== null &&
      value !== undefined &&
      value !== "N/A" &&
      value !== "n/a" &&
      value !== "na" &&
      value !== "NA"
    );
  });
}

export function getEmissionFactor(
  material: WasteMaterial | null,
  disposalMethod: DisposalMethod
): number | null {
  if (!material) return null;

  const value = material[disposalMethod as keyof WasteMaterial];

  if (
    value === null ||
    value === undefined ||
    value === "N/A" ||
    value === "n/a" ||
    value === "na" ||
    value === "NA"
  ) {
    return null;
  }

  const numValue = typeof value === "number" ? value : parseFloat(String(value));
  return isNaN(numValue) ? null : numValue;
}
