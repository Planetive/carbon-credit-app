-- Create optimized functions to get distinct values for filter options
-- These functions use SQL DISTINCT which is much faster than fetching all rows

-- Function to get distinct regions
CREATE OR REPLACE FUNCTION get_distinct_regions()
RETURNS TABLE(region TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT TRIM("Region"::TEXT) as region
  FROM global_projects
  WHERE "Region" IS NOT NULL AND TRIM("Region"::TEXT) != ''
  ORDER BY region;
END;
$$ LANGUAGE plpgsql;

-- Function to get distinct countries
CREATE OR REPLACE FUNCTION get_distinct_countries()
RETURNS TABLE(country TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT TRIM("Country"::TEXT) as country
  FROM global_projects
  WHERE "Country" IS NOT NULL AND TRIM("Country"::TEXT) != ''
  ORDER BY country;
END;
$$ LANGUAGE plpgsql;

-- Function to get distinct voluntary statuses
CREATE OR REPLACE FUNCTION get_distinct_voluntary_statuses()
RETURNS TABLE(status TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT TRIM("Voluntary Status"::TEXT) as status
  FROM global_projects
  WHERE "Voluntary Status" IS NOT NULL AND TRIM("Voluntary Status"::TEXT) != ''
  ORDER BY status;
END;
$$ LANGUAGE plpgsql;

-- Function to get distinct voluntary registries
CREATE OR REPLACE FUNCTION get_distinct_voluntary_registries()
RETURNS TABLE(registry TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT TRIM("Voluntary Registry"::TEXT) as registry
  FROM global_projects
  WHERE "Voluntary Registry" IS NOT NULL AND TRIM("Voluntary Registry"::TEXT) != ''
  ORDER BY registry;
END;
$$ LANGUAGE plpgsql;

-- Function to get distinct areas of interest
CREATE OR REPLACE FUNCTION get_distinct_areas_of_interest()
RETURNS TABLE(area TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT TRIM("Area of Interest"::TEXT) as area
  FROM global_projects
  WHERE "Area of Interest" IS NOT NULL AND TRIM("Area of Interest"::TEXT) != ''
  ORDER BY area;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_distinct_regions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_distinct_countries() TO authenticated;
GRANT EXECUTE ON FUNCTION get_distinct_voluntary_statuses() TO authenticated;
GRANT EXECUTE ON FUNCTION get_distinct_voluntary_registries() TO authenticated;
GRANT EXECUTE ON FUNCTION get_distinct_areas_of_interest() TO authenticated;

