-- Scope 2 - Electricity: main answers and sub-answers

-- Main table stores the top-level answers:
-- - total_kwh: total electricity consumption in kWh
-- - grid_pct, renewable_pct, other_pct: percentage split (validate sums client-side; DB allows 0-100 each)
-- - calculated_emissions_tco2e: optional cached result of electricity emissions
CREATE TABLE IF NOT EXISTS scope2_electricity_main (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    total_kwh NUMERIC,
    grid_pct NUMERIC CHECK (grid_pct >= 0 AND grid_pct <= 100),
    renewable_pct NUMERIC CHECK (renewable_pct >= 0 AND renewable_pct <= 100),
    other_pct NUMERIC CHECK (other_pct >= 0 AND other_pct <= 100),

    calculated_emissions_tco2e NUMERIC,

    status TEXT DEFAULT 'draft' CHECK (status IN ('draft','submitted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_s2_elec_main_user_id ON scope2_electricity_main(user_id);
CREATE INDEX IF NOT EXISTS idx_s2_elec_main_created_at ON scope2_electricity_main(created_at);

-- Subanswers table stores selections needed to compute emissions based on the split
-- For grid: provider_country in ('UAE','Pakistan') and grid_emission_factor (e.g., 0.2, 0.8)
-- For other sources: multiple selectable fuels/combos, each with its own emission_factor
-- type: 'grid' | 'other'. For renewable there are no subanswers (implicitly zero factor)
CREATE TABLE IF NOT EXISTS scope2_electricity_subanswers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    main_id UUID REFERENCES scope2_electricity_main(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

    type TEXT NOT NULL CHECK (type IN ('grid','other')),

    -- Grid-specific fields (nullable for other)
    provider_country TEXT CHECK (provider_country IN ('UAE','Pakistan')),
    grid_emission_factor NUMERIC,

    -- other-source fields (nullable for grid)
    other_sources_type TEXT,      -- e.g., Gaseous fuels, Liquid fuels, Solid fuels
    other_sources_fuel TEXT,                 -- e.g., Butane, CNG, Diesel
    other_sources_unit TEXT,                 -- e.g., tonnes, litres, kWh (Net CV)
    other_sources_quantity NUMERIC CHECK (other_sources_quantity IS NULL OR other_sources_quantity >= 0),
    other_sources_factor NUMERIC CHECK (other_sources_factor IS NULL OR other_sources_factor >= 0),
    other_sources_emissions NUMERIC CHECK (other_sources_emissions IS NULL OR other_sources_emissions >= 0),

    -- Optional notes
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_s2_elec_sub_main_id ON scope2_electricity_subanswers(main_id);
CREATE INDEX IF NOT EXISTS idx_s2_elec_sub_user_id ON scope2_electricity_subanswers(user_id);
CREATE INDEX IF NOT EXISTS idx_s2_elec_sub_type ON scope2_electricity_subanswers(other_sources_type);
CREATE INDEX IF NOT EXISTS idx_s2_elec_sub_fuel ON scope2_electricity_subanswers(other_sources_fuel);

-- updated_at triggers
CREATE OR REPLACE FUNCTION update_timestamp_scope2_electricity_main()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_scope2_electricity_main
BEFORE UPDATE ON scope2_electricity_main
FOR EACH ROW EXECUTE FUNCTION update_timestamp_scope2_electricity_main();

CREATE OR REPLACE FUNCTION update_timestamp_scope2_electricity_subanswers()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_scope2_electricity_subanswers
BEFORE UPDATE ON scope2_electricity_subanswers
FOR EACH ROW EXECUTE FUNCTION update_timestamp_scope2_electricity_subanswers();

-- RLS
ALTER TABLE scope2_electricity_main ENABLE ROW LEVEL SECURITY;
ALTER TABLE scope2_electricity_subanswers ENABLE ROW LEVEL SECURITY;

-- Policies: users can CRUD their own rows
CREATE POLICY s2_elec_main_select ON scope2_electricity_main FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY s2_elec_main_insert ON scope2_electricity_main FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY s2_elec_main_update ON scope2_electricity_main FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY s2_elec_main_delete ON scope2_electricity_main FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY s2_elec_sub_select ON scope2_electricity_subanswers FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY s2_elec_sub_insert ON scope2_electricity_subanswers FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY s2_elec_sub_update ON scope2_electricity_subanswers FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY s2_elec_sub_delete ON scope2_electricity_subanswers FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON TABLE scope2_electricity_main IS 'Scope 2 Electricity - main answers (total and percentage splits)';
COMMENT ON TABLE scope2_electricity_subanswers IS 'Scope 2 Electricity - subanswers for grid and other sources';



