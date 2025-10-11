-- Create global_projects table
CREATE TABLE IF NOT EXISTS public.global_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "Project ID" text,
  "Project Name" text,
  "Voluntary Registry" text,
  "Voluntary Status" text,
  "Area of Interest" text,
  "Type" text, 
  "End Goal" text,
  "Methodology" text,
  "Methodology Version" text,
  "Region" text,
  "Country" text,
  "Project Site Location" text,
  "Project Developer" text,
  "Total Credits Issued" text,
  "Total Credits Retired" text,
  "Total Credits Remaining" text,
  "First Year of Project (Vintage)" text,
  "Project Owner" text,  
  "Offset Project Operator" text, 
  "Verifier" text,
  "Estimated Annual Emission Reductions" text,
  "Planned Emission Reductions" text,
  "Project Listed" date,
  "Project Registered" date,  
  "Sustainability Certifications" text,
  "Registry Documents" text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for global_projects
ALTER TABLE public.global_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow read for all users (including unauthenticated)
CREATE POLICY "Allow read for all" ON public.global_projects
FOR SELECT
USING (true);

-- RLS Policy: Allow insert/update/delete for authenticated users only
CREATE POLICY "Allow modify for authenticated" ON public.global_projects
FOR ALL
USING (auth.role() = 'authenticated');

