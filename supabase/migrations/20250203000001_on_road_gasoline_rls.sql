-- RLS policies for "On-Road Gasoline" reference table
-- Table stores Vehicle Type, Model Year, CH4/N2O factors (g per vehicle-mile).
-- Table name in DB: "On-Road Gasoline" (double-quoted in SQL because of spaces/hyphen).

ALTER TABLE "On-Road Gasoline" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "On-Road Gasoline readable by authenticated users" ON "On-Road Gasoline";
CREATE POLICY "On-Road Gasoline readable by authenticated users"
ON "On-Road Gasoline"
FOR SELECT
USING (auth.role() = 'authenticated');

COMMENT ON TABLE "On-Road Gasoline" IS
  'Reference table for Scope 1 on-road gasoline: Vehicle Type, Model Year, CH4/N2O factors (g per vehicle-mile).';
