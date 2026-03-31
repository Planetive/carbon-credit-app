import { supabase } from '@/integrations/supabase/client';

interface InvitationEmailData {
  email: string;
  organizationName: string;
  inviterName?: string;
  role: string;
  invitationLink: string;
  expiresAt: Date;
}

interface ContactNotificationData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  subject: string;
  message: string;
}

/**
 * Send organization invitation email
 * Uses Supabase's built-in email service or can be extended to use EmailJS
 */
export async function sendInvitationEmail(data: InvitationEmailData): Promise<{ success: boolean; error?: any }> {
  try {
    // Option 1: Use Supabase Edge Function (recommended)
    // This requires setting up a Supabase Edge Function
    // For now, we'll use a database trigger or RPC function
    
    // Option 2: Use EmailJS (if configured)
    // Uncomment and configure if using EmailJS
    /*
    if (import.meta.env.VITE_EMAILJS_SERVICE_ID && import.meta.env.VITE_EMAILJS_TEMPLATE_ID) {
      return await sendViaEmailJS(data);
    }
    */

    // Option 3: Use Supabase RPC to send email via database trigger
    // This is the simplest approach - the database trigger will handle email sending
    // For now, we'll just log and return success
    // In production, you should set up Supabase email templates or Edge Functions
    
    console.log('Invitation email would be sent:', {
      to: data.email,
      organization: data.organizationName,
      link: data.invitationLink,
    });

    // TODO: Implement actual email sending via:
    // 1. Supabase Edge Function
    // 2. Database trigger with Supabase email service
    // 3. EmailJS (if configured)
    // 4. External email service API

    return { success: true };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return { success: false, error };
  }
}

/**
 * Send contact form notification email to internal inbox.
 * Requires EmailJS env vars:
 * - VITE_EMAILJS_SERVICE_ID
 * - VITE_EMAILJS_CONTACT_TEMPLATE_ID
 * - VITE_EMAILJS_PUBLIC_KEY
 */
export async function sendContactNotificationEmail(
  data: ContactNotificationData
): Promise<{ success: boolean; error?: any }> {
  try {
    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_CONTACT_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      throw new Error(
        "EmailJS contact notification configuration missing (VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_CONTACT_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY)"
      );
    }

    const emailjs = await import("@emailjs/browser");
    const templateParams = {
      to_email: "connect@rethinkcarbon.io",
      from_name: data.name,
      reply_to: data.email,
      from_email: data.email,
      company: data.company || "N/A",
      phone: data.phone || "N/A",
      subject: data.subject,
      message: data.message,
      submitted_at: new Date().toISOString(),
    };

    await emailjs.send(serviceId, templateId, templateParams, publicKey);
    return { success: true };
  } catch (error) {
    console.error("Error sending contact notification email:", error);
    return { success: false, error };
  }
}

/**
 * Send email via EmailJS (if configured)
 */
async function sendViaEmailJS(data: InvitationEmailData): Promise<{ success: boolean; error?: any }> {
  try {
    const emailjs = await import('@emailjs/browser');
    
    const templateParams = {
      to_email: data.email,
      organization_name: data.organizationName,
      inviter_name: data.inviterName || 'Team',
      role: data.role,
      invitation_link: data.invitationLink,
      expires_at: data.expiresAt.toLocaleDateString(),
    };

    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || !templateId || !publicKey) {
      throw new Error('EmailJS configuration missing');
    }

    await emailjs.send(serviceId, templateId, templateParams, publicKey);
    
    return { success: true };
  } catch (error) {
    console.error('EmailJS error:', error);
    return { success: false, error };
  }
}

/**
 * Generate invitation link
 */
export function generateInvitationLink(token: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/accept-invitation?token=${encodeURIComponent(token)}`;
}

