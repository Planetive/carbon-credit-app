import { USE_JWT_AUTH } from "./config";
import { getMyProfile, type ProfileResponse } from "./profile";
import { supabase } from "@/integrations/supabase/client";

/**
 * Load current user's profile via JWT API when enabled, else Supabase profiles.
 */
export async function fetchMyProfileDual(
  userId: string
): Promise<Partial<ProfileResponse> & { contact_role?: string | null } | null> {
  if (USE_JWT_AUTH) {
    try {
      return await getMyProfile();
    } catch (err) {
      console.warn("[profileDualRead] getMyProfile failed", err);
      return null;
    }
  }

  const { data, error } = await (supabase as any)
    .from("profiles")
    .select(
      "id, user_id, user_type, display_name, phone, organization_name, current_organization_id"
    )
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    console.warn("[profileDualRead] profiles select failed", error);
    return null;
  }
  return data as Partial<ProfileResponse> & { contact_role?: string | null };
}
