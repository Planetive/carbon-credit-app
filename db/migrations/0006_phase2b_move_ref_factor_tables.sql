-- Phase 2B — Move emission factor tables into schema ref
-- Leaves compatibility VIEWS in public with old names.
-- Full factor_datasets / factor_rows model comes in a later Phase 2 step.

BEGIN;

ALTER TABLE IF EXISTS public."UK_Fuel_Factors" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."UK_Fuel_Factors" AS SELECT * FROM ref."UK_Fuel_Factors";

ALTER TABLE IF EXISTS public."UK_Passenger_factors" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."UK_Passenger_factors" AS SELECT * FROM ref."UK_Passenger_factors";

ALTER TABLE IF EXISTS public."UK_delivery-factors" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."UK_delivery-factors" AS SELECT * FROM ref."UK_delivery-factors";

ALTER TABLE IF EXISTS public."UK_refrigerant_factors" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."UK_refrigerant_factors" AS SELECT * FROM ref."UK_refrigerant_factors";

ALTER TABLE IF EXISTS public."Fuel EPA 1" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."Fuel EPA 1" AS SELECT * FROM ref."Fuel EPA 1";

ALTER TABLE IF EXISTS public."Fuel EPA 2" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."Fuel EPA 2" AS SELECT * FROM ref."Fuel EPA 2";

ALTER TABLE IF EXISTS public."Fuel EPA 3" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."Fuel EPA 3" AS SELECT * FROM ref."Fuel EPA 3";

ALTER TABLE IF EXISTS public."Mobile Combustion" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."Mobile Combustion" AS SELECT * FROM ref."Mobile Combustion";

ALTER TABLE IF EXISTS public."Stationary Combustion" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."Stationary Combustion" AS SELECT * FROM ref."Stationary Combustion";

ALTER TABLE IF EXISTS public."On-Road Gasoline" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."On-Road Gasoline" AS SELECT * FROM ref."On-Road Gasoline";

ALTER TABLE IF EXISTS public."On-Road Diesel & Alt Fuel" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."On-Road Diesel & Alt Fuel" AS SELECT * FROM ref."On-Road Diesel & Alt Fuel";

ALTER TABLE IF EXISTS public."Non-Road Vehicle" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."Non-Road Vehicle" AS SELECT * FROM ref."Non-Road Vehicle";

ALTER TABLE IF EXISTS public."heat and steam" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."heat and steam" AS SELECT * FROM ref."heat and steam";

ALTER TABLE IF EXISTS public."heat and steam EBT" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."heat and steam EBT" AS SELECT * FROM ref."heat and steam EBT";

ALTER TABLE IF EXISTS public.waste SET SCHEMA ref;
CREATE OR REPLACE VIEW public.waste AS SELECT * FROM ref.waste;

ALTER TABLE IF EXISTS public."business travel" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."business travel" AS SELECT * FROM ref."business travel";

ALTER TABLE IF EXISTS public."Upstream Transportation and Distribution" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."Upstream Transportation and Distribution" AS
  SELECT * FROM ref."Upstream Transportation and Distribution";

ALTER TABLE IF EXISTS public."EPA Refrigerant GWP" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."EPA Refrigerant GWP" AS SELECT * FROM ref."EPA Refrigerant GWP";

-- IPCC factor sheets
ALTER TABLE IF EXISTS public."IPCC 1" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."IPCC 1" AS SELECT * FROM ref."IPCC 1";

ALTER TABLE IF EXISTS public."IPCC 2" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."IPCC 2" AS SELECT * FROM ref."IPCC 2";

ALTER TABLE IF EXISTS public."IPCC 2 Energy" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."IPCC 2 Energy" AS SELECT * FROM ref."IPCC 2 Energy";

ALTER TABLE IF EXISTS public."IPCC 2 Manufacturing" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."IPCC 2 Manufacturing" AS SELECT * FROM ref."IPCC 2 Manufacturing";

ALTER TABLE IF EXISTS public."IPCC 2 Industrial" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."IPCC 2 Industrial" AS SELECT * FROM ref."IPCC 2 Industrial";

ALTER TABLE IF EXISTS public."IPCC 2 Utility Sources" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."IPCC 2 Utility Sources" AS SELECT * FROM ref."IPCC 2 Utility Sources";

ALTER TABLE IF EXISTS public."IPCC 2 KILNS, OVENS, AND DRYERS" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."IPCC 2 KILNS, OVENS, AND DRYERS" AS
  SELECT * FROM ref."IPCC 2 KILNS, OVENS, AND DRYERS";

ALTER TABLE IF EXISTS public."IPCC_2_Commercial_Institutional" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."IPCC_2_Commercial_Institutional" AS
  SELECT * FROM ref."IPCC_2_Commercial_Institutional";

ALTER TABLE IF EXISTS public."IPCC_2_RESIDENTIAL_AND_AGRICULTURE_FORESTRY_FISHING_FISHING_FAR" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."IPCC_2_RESIDENTIAL_AND_AGRICULTURE_FORESTRY_FISHING_FISHING_FAR" AS
  SELECT * FROM ref."IPCC_2_RESIDENTIAL_AND_AGRICULTURE_FORESTRY_FISHING_FISHING_FAR";

ALTER TABLE IF EXISTS public."IPCC Residential" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."IPCC Residential" AS SELECT * FROM ref."IPCC Residential";

ALTER TABLE IF EXISTS public."IPCC 3" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."IPCC 3" AS SELECT * FROM ref."IPCC 3";

ALTER TABLE IF EXISTS public."IPCC 3  CO2" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."IPCC 3  CO2" AS SELECT * FROM ref."IPCC 3  CO2";

ALTER TABLE IF EXISTS public."IPCC 3 ROAD TRANSPORT" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."IPCC 3 ROAD TRANSPORT" AS SELECT * FROM ref."IPCC 3 ROAD TRANSPORT";

ALTER TABLE IF EXISTS public."IPCC 3 Road Transport with Vehicle Type" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."IPCC 3 Road Transport with Vehicle Type" AS
  SELECT * FROM ref."IPCC 3 Road Transport with Vehicle Type";

ALTER TABLE IF EXISTS public."IPCC 3 USA GASOLINE AND DIESEL VEHICLES" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."IPCC 3 USA GASOLINE AND DIESEL VEHICLES" AS
  SELECT * FROM ref."IPCC 3 USA GASOLINE AND DIESEL VEHICLES";

ALTER TABLE IF EXISTS public."IPCC 3 ALTERNATIVE FUEL VEHICLES" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."IPCC 3 ALTERNATIVE FUEL VEHICLES" AS
  SELECT * FROM ref."IPCC 3 ALTERNATIVE FUEL VEHICLES";

ALTER TABLE IF EXISTS public."IPCC 3 EUROPEAN GASOLINE AND DIESEL VEHICLES" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."IPCC 3 EUROPEAN GASOLINE AND DIESEL VEHICLES" AS
  SELECT * FROM ref."IPCC 3 EUROPEAN GASOLINE AND DIESEL VEHICLES";

ALTER TABLE IF EXISTS public."IPCC 3 OFF-ROAD MOBILE SOURCES AND MACHINERY" SET SCHEMA ref;
CREATE OR REPLACE VIEW public."IPCC 3 OFF-ROAD MOBILE SOURCES AND MACHINERY" AS
  SELECT * FROM ref."IPCC 3 OFF-ROAD MOBILE SOURCES AND MACHINERY";

GRANT SELECT ON ALL TABLES IN SCHEMA ref TO catalog_reader, app_user;
GRANT USAGE ON SCHEMA ref TO catalog_reader, app_user, migrator;

INSERT INTO public.schema_migrations (version, description)
VALUES (
  '0006_phase2b_move_ref_factor_tables',
  'Move emission factor tables to ref.*; public.* kept as compatibility views'
)
ON CONFLICT (version) DO NOTHING;

SELECT 'ref.UK_Fuel_Factors' AS table_name, COUNT(*)::bigint AS n FROM ref."UK_Fuel_Factors"
UNION ALL SELECT 'ref.Fuel EPA 1', COUNT(*) FROM ref."Fuel EPA 1"
UNION ALL SELECT 'public.view UK_Fuel_Factors', COUNT(*) FROM public."UK_Fuel_Factors"
ORDER BY 1;

COMMIT;
