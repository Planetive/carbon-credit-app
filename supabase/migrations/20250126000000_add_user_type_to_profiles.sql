-- Add user_type field to profiles table
-- This field distinguishes between 'corporate' and 'financial_institution' users
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'financial_institution' CHECK (user_type IN ('corporate', 'financial_institution'));

-- Add comment to explain the field
COMMENT ON COLUMN public.profiles.user_type IS 'Type of user: corporate or financial_institution. Determines dashboard UI and features.';

