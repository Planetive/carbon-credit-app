import { supabase } from "@/integrations/supabase/client";
import { Supplier } from "./types";

/**
 * Search suppliers by name (case-insensitive, partial match)
 * @param searchTerm - Search term to match against supplier names
 * @param limit - Maximum number of results to return (default: 20)
 * @returns Array of matching suppliers
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

/**
 * Get supplier by ID
 * @param id - Supplier ID
 * @returns Supplier or null if not found
 */
export async function getSupplierById(id: string): Promise<Supplier | null> {
  try {
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

/**
 * Get supplier by code
 * @param code - Supplier code
 * @returns Supplier or null if not found
 */
export async function getSupplierByCode(code: string): Promise<Supplier | null> {
  try {
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

