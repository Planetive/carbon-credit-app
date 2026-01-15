-- Migration: Add email sending trigger for organization invitations
-- This creates a database trigger that can be used to send emails when invitations are created
-- Note: Actual email sending should be configured via Supabase Edge Functions or external service

-- Function to send invitation email (placeholder - actual implementation depends on email service)
-- This function can be called by a trigger or Edge Function
CREATE OR REPLACE FUNCTION public.send_invitation_email(
  p_invitation_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_invitation RECORD;
  v_organization RECORD;
  v_inviter RECORD;
BEGIN
  -- Get invitation details
  SELECT 
    i.*,
    o.name as organization_name,
    p.display_name as inviter_name,
    u.email as inviter_email
  INTO v_invitation
  FROM public.organization_invitations i
  JOIN public.organizations o ON o.id = i.organization_id
  LEFT JOIN public.profiles p ON p.user_id = i.invited_by
  LEFT JOIN auth.users u ON u.id = i.invited_by
  WHERE i.id = p_invitation_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Log invitation creation (for debugging)
  -- In production, this would trigger an Edge Function or external email service
  RAISE NOTICE 'Invitation created: % to join % (invited by %)', 
    v_invitation.email, 
    v_invitation.organization_name,
    COALESCE(v_invitation.inviter_name, v_invitation.inviter_email, 'Unknown');

  -- TODO: Integrate with Supabase Edge Function or external email service
  -- Example: Call Supabase Edge Function via HTTP
  -- PERFORM net.http_post(
  --   url := 'https://your-project.supabase.co/functions/v1/send-invitation-email',
  --   headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')),
  --   body := jsonb_build_object(
  --     'invitation_id', p_invitation_id,
  --     'email', v_invitation.email,
  --     'organization_name', v_invitation.organization_name,
  --     'inviter_name', COALESCE(v_invitation.inviter_name, 'Team'),
  --     'role', v_invitation.role,
  --     'token', v_invitation.token,
  --     'expires_at', v_invitation.expires_at
  --   )
  -- );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Create a trigger to automatically send email when invitation is created
-- Uncomment if you want automatic email sending via trigger
-- CREATE OR REPLACE FUNCTION public.trigger_send_invitation_email()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   PERFORM public.send_invitation_email(NEW.id);
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- DROP TRIGGER IF EXISTS on_invitation_created ON public.organization_invitations;
-- CREATE TRIGGER on_invitation_created
--   AFTER INSERT ON public.organization_invitations
--   FOR EACH ROW
--   EXECUTE FUNCTION public.trigger_send_invitation_email();

COMMENT ON FUNCTION public.send_invitation_email IS 'Placeholder function for sending invitation emails. Should be integrated with Supabase Edge Function or external email service.';

