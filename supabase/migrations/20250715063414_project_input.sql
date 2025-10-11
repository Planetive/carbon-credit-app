CREATE TABLE public.project_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),

  -- User Info
  current_industry text,
  industry_size text,

  -- Emissions Knowledge
  has_emissions_knowledge text, -- 'yes' or 'no'
  ghg_types text,               -- Greenhouse Gas types (e.g., CO2, CH4, N2O)
  ghg_sources text,             -- Sources (e.g., energy use, industrial processes)
  ghg_annual numeric,              -- Estimated annual emissions (metric tons CO2e)
  waste_volume numeric,            -- Wastewater volume (e.g., cubic meters/day)
  waste_pollutants text,        -- Pollutants (e.g., nitrogen, phosphorus, BOD, COD)
  waste_treatment text,         -- Treatment methods (e.g., activated sludge)
  waste_destination text,       -- Discharge destination (e.g., surface water, sewer)
  other_type text,              -- Other discharge type (e.g., solid waste, chemical effluents)
  other_volume numeric,            -- Other discharge volume
  other_disposal text,          -- Other discharge disposal method

  -- Project Info
  project_name text,
  country text,
  area_of_interest text,        -- matches formData.areaOfInterest
  subcategory text,             -- matches formData.subcategory (Type)
  goal text,                    -- matches formData.goal (End Goal)
  register_for_credits boolean,
  development_strategy text,    -- 'self' or 'third-party'
  additional_info text          -- instructions for AI analysis
);

ALTER TABLE public.project_inputs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert into project_inputs
CREATE POLICY "Allow insert for authenticated"
ON public.project_inputs
FOR INSERT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow select for authenticated"
ON public.project_inputs
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete own drafts"
ON public.project_inputs
FOR DELETE
USING (user_id = auth.uid());

create index if not exists idx_project_inputs_user_id on project_inputs(user_id);
