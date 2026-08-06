import { USE_JWT_AUTH } from "@/api/config";
import {
  createMyProjectInput,
  deleteMyProjectInput,
  getMyProjectInput,
  listMyProjectInputs,
  listMyProjectReports,
  type ProjectInput,
  type ProjectInputCreate,
  type ProjectReport,
} from "@/api/projects";
import { supabase } from "./client";

export type { ProjectInput, ProjectInputCreate, ProjectReport };

function normalizeProjectRow(row: Record<string, unknown>): ProjectInput {
  const type =
    (row.type as string | null | undefined) ??
    (row.subcategory as string | null | undefined) ??
    null;
  return {
    ...(row as ProjectInput),
    type,
    subcategory: (row.subcategory as string | null | undefined) ?? type,
  };
}

export async function listProjectInputs(userId: string): Promise<ProjectInput[]> {
  if (USE_JWT_AUTH) {
    const rows = await listMyProjectInputs();
    return rows.map((r) => normalizeProjectRow(r as unknown as Record<string, unknown>));
  }

  const { data, error } = await (supabase as any)
    .from("project_inputs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data || []) as Record<string, unknown>[]).map(normalizeProjectRow);
}

export async function getProjectInput(
  userId: string,
  id: string
): Promise<ProjectInput | null> {
  if (USE_JWT_AUTH) {
    try {
      const row = await getMyProjectInput(id);
      return normalizeProjectRow(row as unknown as Record<string, unknown>);
    } catch {
      return null;
    }
  }

  const { data, error } = await supabase
    .from("project_inputs" as any)
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return normalizeProjectRow(data as Record<string, unknown>);
}

export async function createProjectInput(
  userId: string,
  payload: ProjectInputCreate
): Promise<ProjectInput> {
  const body: ProjectInputCreate = {
    ...payload,
    // Persist both aliases for schema drift (type vs subcategory)
    type: payload.type ?? payload.subcategory ?? null,
    subcategory: payload.subcategory ?? payload.type ?? null,
  };

  if (USE_JWT_AUTH) {
    const created = await createMyProjectInput(body);
    return normalizeProjectRow(created as unknown as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("project_inputs" as any)
    .insert([{ ...body, user_id: userId }])
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return normalizeProjectRow((data || body) as Record<string, unknown>);
}

export async function deleteProjectInput(id: string): Promise<void> {
  if (USE_JWT_AUTH) {
    await deleteMyProjectInput(id);
    return;
  }

  const { error } = await (supabase as any).from("project_inputs").delete().eq("id", id);
  if (error) throw error;
}

/** Best-effort reports list; empty array on missing table / API. */
export async function listProjectReports(userId: string): Promise<ProjectReport[]> {
  if (USE_JWT_AUTH) {
    try {
      return await listMyProjectReports();
    } catch (err) {
      console.warn("Could not load project reports via API:", err);
      return [];
    }
  }

  try {
    const { data, error } = await (supabase as any)
      .from("project_reports")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("Could not load reports:", error.message);
      return [];
    }
    return (data ?? []) as ProjectReport[];
  } catch (err) {
    console.warn("Could not load reports:", err);
    return [];
  }
}
