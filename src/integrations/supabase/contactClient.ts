import {
  createContactSubmission,
  deleteAdminContactSubmission,
  isAdminContactApiEnabled,
  isContactApiEnabled,
  listAdminContactSubmissions,
  patchAdminContactSubmission,
  type ContactSubmission,
  type ContactSubmissionCreate,
} from "@/api/contact";
import { supabase } from "./client";

export type { ContactSubmission, ContactSubmissionCreate };

export async function submitContactForm(
  payload: ContactSubmissionCreate
): Promise<ContactSubmission> {
  if (isContactApiEnabled()) {
    return createContactSubmission(payload);
  }

  const { data, error } = await supabase
    .from("contact_submissions")
    .insert([
      {
        name: payload.name,
        email: payload.email,
        company: payload.company ?? null,
        phone: payload.phone ?? null,
        subject: payload.subject,
        message: payload.message,
        status: payload.status || "new",
      },
    ])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data as ContactSubmission;
}

export async function listContactSubmissions(): Promise<ContactSubmission[]> {
  if (isAdminContactApiEnabled()) {
    return listAdminContactSubmissions();
  }

  const { data, error } = await supabase
    .from("contact_submissions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as ContactSubmission[];
}

export async function updateContactSubmissionStatus(
  id: string,
  status: string
): Promise<void> {
  if (isAdminContactApiEnabled()) {
    await patchAdminContactSubmission(id, { status });
    return;
  }

  const { error } = await (supabase as any)
    .from("contact_submissions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteContactSubmission(id: string): Promise<void> {
  if (isAdminContactApiEnabled()) {
    await deleteAdminContactSubmission(id);
    return;
  }

  const { error } = await supabase.from("contact_submissions").delete().eq("id", id);
  if (error) throw error;
}
