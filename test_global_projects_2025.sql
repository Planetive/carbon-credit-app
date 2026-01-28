-- Test queries for global_projects_2025 table
-- Run these in Supabase SQL Editor to debug

-- 1. Check if table exists and has data
SELECT COUNT(*) as total_rows FROM public.global_projects_2025;

-- 2. Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'global_projects_2025';

-- 3. Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'global_projects_2025';

-- 4. Try to select a few rows (this will test RLS)
SELECT "Project Name", "Country", "Region" 
FROM public.global_projects_2025 
LIMIT 5;

-- 5. Check column names (to verify they match)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'global_projects_2025'
ORDER BY ordinal_position;
