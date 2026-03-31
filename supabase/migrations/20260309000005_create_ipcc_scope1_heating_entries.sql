-- Scope 1 IPCC Heating monthly saved entries
CREATE TABLE IF NOT EXISTS public.ipcc_scope1_heating_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_start DATE NOT NULL,
  heating_mmscf NUMERIC NOT NULL CHECK (heating_mmscf >= 0),
  ghv NUMERIC NOT NULL CHECK (ghv >= 0),
  natural_gas_factor NUMERIC NOT NULL CHECK (natural_gas_factor >= 0),
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, month_start)
);

CREATE INDEX IF NOT EXISTS idx_ipcc_scope1_heating_entries_user_id
  ON public.ipcc_scope1_heating_entries(user_id);

CREATE INDEX IF NOT EXISTS idx_ipcc_scope1_heating_entries_month_start
  ON public.ipcc_scope1_heating_entries(month_start);

ALTER TABLE public.ipcc_scope1_heating_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own heating entries"
  ON public.ipcc_scope1_heating_entries;
CREATE POLICY "Users can read own heating entries"
  ON public.ipcc_scope1_heating_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own heating entries"
  ON public.ipcc_scope1_heating_entries;
CREATE POLICY "Users can insert own heating entries"
  ON public.ipcc_scope1_heating_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own heating entries"
  ON public.ipcc_scope1_heating_entries;
CREATE POLICY "Users can update own heating entries"
  ON public.ipcc_scope1_heating_entries
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own heating entries"
  ON public.ipcc_scope1_heating_entries;
CREATE POLICY "Users can delete own heating entries"
  ON public.ipcc_scope1_heating_entries
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_ipcc_scope1_heating_entries_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ipcc_scope1_heating_entries_updated_at
  ON public.ipcc_scope1_heating_entries;
CREATE TRIGGER trg_ipcc_scope1_heating_entries_updated_at
  BEFORE UPDATE ON public.ipcc_scope1_heating_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ipcc_scope1_heating_entries_updated_at();
