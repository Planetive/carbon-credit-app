-- Fix RLS policies for global_projects_2025
-- Run this if data is not showing

-- First, drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read for all on global_projects_2025" ON public.global_projects_2025;
DROP POLICY IF EXISTS "Allow modify for authenticated on global_projects_2025" ON public.global_projects_2025;
DROP POLICY IF EXISTS "Allow read for authenticated on global_projects_2025" ON public.global_projects_2025;
DROP POLICY IF EXISTS "Allow modify for service role on global_projects_2025" ON public.global_projects_2025;

-- Ensure RLS is enabled
ALTER TABLE public.global_projects_2025 ENABLE ROW LEVEL SECURITY;

-- Create a simple SELECT policy that allows everyone (including anon)
CREATE POLICY "global_projects_2025_select_all" 
ON public.global_projects_2025
FOR SELECT
TO public
USING (true);

-- Create INSERT/UPDATE/DELETE policy for authenticated users
CREATE POLICY "global_projects_2025_modify_authenticated" 
ON public.global_projects_2025
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
