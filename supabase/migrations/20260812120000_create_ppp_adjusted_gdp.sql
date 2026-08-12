-- Mirror of ref.ppp_adjusted_gdp for Supabase dual-read (populate via CSV import or sync from EC2).

CREATE TABLE IF NOT EXISTS public.ppp_adjusted_gdp (
  country_name TEXT PRIMARY KEY,
  gdp_2024 NUMERIC(20, 4),
  gdp_2025 NUMERIC(20, 4)
);

ALTER TABLE public.ppp_adjusted_gdp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read ppp_adjusted_gdp"
  ON public.ppp_adjusted_gdp
  FOR SELECT
  TO anon, authenticated
  USING (true);

COMMENT ON TABLE public.ppp_adjusted_gdp IS
  'PPP-adjusted GDP by country for sovereign debt. Prefer 2025; fall back to 2024 when null.';
