import { supabase } from "@/integrations/supabase/client";
import { tryLoadCatalogViaApi } from "@/api/catalogDualRead";
import { Supplier } from "./types";

function mapSupplier(row: Record<string, unknown>): Supplier {
  return row as unknown as Supplier;
}

/**
 * Search suppliers by name (case-insensitive, partial match)
 */
export async function searchSuppliers(
  searchTerm: string,
  limit: number = 20
): Promise<Supplier[]> {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return [];
  }

  const trimmedSearch = searchTerm.trim();

  try {
    const apiRows = await tryLoadCatalogViaApi("suppliers", {
      q: trimmedSearch,
      limit,
    });
    if (apiRows) {
      return apiRows.map(mapSupplier);
    }

    const { data, error } = await supabase
      .from("suppliers" as any)
      .select("*")
      .ilike("supplier_name", `%${trimmedSearch}%`)
      .order("supplier_name", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("Error searching suppliers:", error);
      return [];
    }

    return (data || []) as unknown as Supplier[];
  } catch (error) {
    console.error("Error searching suppliers:", error);
    return [];
  }
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  try {
    const apiRows = await tryLoadCatalogViaApi("suppliers", { q: "", limit: 500 });
    if (apiRows) {
      const hit = apiRows.find((r) => String(r.id) === String(id));
      return hit ? mapSupplier(hit) : null;
    }

    const { data, error } = await supabase
      .from("suppliers" as any)
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching supplier:", error);
      return null;
    }

    return data as unknown as Supplier;
  } catch (error) {
    console.error("Error fetching supplier:", error);
    return null;
  }
}

export async function getSupplierByCode(code: string): Promise<Supplier | null> {
  try {
    const apiRows = await tryLoadCatalogViaApi("suppliers", { q: code, limit: 50 });
    if (apiRows) {
      const hit = apiRows.find(
        (r) => String(r.code || "").toLowerCase() === code.toLowerCase()
      );
      return hit ? mapSupplier(hit) : null;
    }

    const { data, error } = await supabase
      .from("suppliers" as any)
      .select("*")
      .eq("code", code)
      .single();

    if (error) {
      console.error("Error fetching supplier by code:", error);
      return null;
    }

    return data as unknown as Supplier;
  } catch (error) {
    console.error("Error fetching supplier by code:", error);
    return null;
  }
}
