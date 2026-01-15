-- Update all RPC functions to use global_projects_2025 instead of global_projects

-- Function to get distinct regions
CREATE OR REPLACE FUNCTION get_distinct_regions()
RETURNS TABLE(region TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT TRIM("Region"::TEXT) as region
  FROM global_projects_2025
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
  FROM global_projects_2025
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
  FROM global_projects_2025
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
  FROM global_projects_2025
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
  FROM global_projects_2025
  WHERE "Area of Interest" IS NOT NULL AND TRIM("Area of Interest"::TEXT) != ''
  ORDER BY area;
END;
$$ LANGUAGE plpgsql;

-- Function to get country counts (for chart)
CREATE OR REPLACE FUNCTION get_country_counts(
  p_regions TEXT[] DEFAULT NULL,
  p_voluntary_statuses TEXT[] DEFAULT NULL,
  p_voluntary_registries TEXT[] DEFAULT NULL,
  p_countries TEXT[] DEFAULT NULL,
  p_areas_of_interest TEXT[] DEFAULT NULL
)
RETURNS TABLE(country TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRIM("Country"::TEXT) as country,
    COUNT(*)::BIGINT as count
  FROM global_projects_2025
  WHERE 
    ("Country" IS NOT NULL AND TRIM("Country"::TEXT) != '')
    AND (p_regions IS NULL OR "Region" = ANY(p_regions))
    AND (p_voluntary_statuses IS NULL OR "Voluntary Status" = ANY(p_voluntary_statuses))
    AND (p_voluntary_registries IS NULL OR "Voluntary Registry" = ANY(p_voluntary_registries))
    AND (p_countries IS NULL OR "Country" = ANY(p_countries))
    AND (p_areas_of_interest IS NULL OR "Area of Interest" = ANY(p_areas_of_interest))
  GROUP BY TRIM("Country"::TEXT)
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get region counts (for chart)
CREATE OR REPLACE FUNCTION get_region_counts(
  p_regions TEXT[] DEFAULT NULL,
  p_voluntary_statuses TEXT[] DEFAULT NULL,
  p_voluntary_registries TEXT[] DEFAULT NULL,
  p_countries TEXT[] DEFAULT NULL,
  p_areas_of_interest TEXT[] DEFAULT NULL
)
RETURNS TABLE(region TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRIM("Region"::TEXT) as region,
    COUNT(*)::BIGINT as count
  FROM global_projects_2025
  WHERE 
    ("Region" IS NOT NULL AND TRIM("Region"::TEXT) != '')
    AND (p_regions IS NULL OR "Region" = ANY(p_regions))
    AND (p_voluntary_statuses IS NULL OR "Voluntary Status" = ANY(p_voluntary_statuses))
    AND (p_voluntary_registries IS NULL OR "Voluntary Registry" = ANY(p_voluntary_registries))
    AND (p_countries IS NULL OR "Country" = ANY(p_countries))
    AND (p_areas_of_interest IS NULL OR "Area of Interest" = ANY(p_areas_of_interest))
  GROUP BY TRIM("Region"::TEXT)
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get status counts (for chart)
CREATE OR REPLACE FUNCTION get_status_counts(
  p_regions TEXT[] DEFAULT NULL,
  p_voluntary_statuses TEXT[] DEFAULT NULL,
  p_voluntary_registries TEXT[] DEFAULT NULL,
  p_countries TEXT[] DEFAULT NULL,
  p_areas_of_interest TEXT[] DEFAULT NULL
)
RETURNS TABLE(status TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TRIM("Voluntary Status"::TEXT) as status,
    COUNT(*)::BIGINT as count
  FROM global_projects_2025
  WHERE 
    ("Voluntary Status" IS NOT NULL AND TRIM("Voluntary Status"::TEXT) != '')
    AND (p_regions IS NULL OR "Region" = ANY(p_regions))
    AND (p_voluntary_statuses IS NULL OR "Voluntary Status" = ANY(p_voluntary_statuses))
    AND (p_voluntary_registries IS NULL OR "Voluntary Registry" = ANY(p_voluntary_registries))
    AND (p_countries IS NULL OR "Country" = ANY(p_countries))
    AND (p_areas_of_interest IS NULL OR "Area of Interest" = ANY(p_areas_of_interest))
  GROUP BY TRIM("Voluntary Status"::TEXT)
  ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get stats (total projects, unique countries, unique regions, active projects)
CREATE OR REPLACE FUNCTION get_project_stats(
  p_regions TEXT[] DEFAULT NULL,
  p_voluntary_statuses TEXT[] DEFAULT NULL,
  p_voluntary_registries TEXT[] DEFAULT NULL,
  p_countries TEXT[] DEFAULT NULL,
  p_areas_of_interest TEXT[] DEFAULT NULL
)
RETURNS TABLE(
  total_projects BIGINT,
  unique_countries BIGINT,
  unique_regions BIGINT,
  active_projects BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered_projects AS (
    SELECT *
    FROM global_projects_2025
    WHERE 
      (p_regions IS NULL OR "Region" = ANY(p_regions))
      AND (p_voluntary_statuses IS NULL OR "Voluntary Status" = ANY(p_voluntary_statuses))
      AND (p_voluntary_registries IS NULL OR "Voluntary Registry" = ANY(p_voluntary_registries))
      AND (p_countries IS NULL OR "Country" = ANY(p_countries))
      AND (p_areas_of_interest IS NULL OR "Area of Interest" = ANY(p_areas_of_interest))
  )
  SELECT 
    COUNT(*)::BIGINT as total_projects,
    COUNT(DISTINCT TRIM("Country"::TEXT)) FILTER (WHERE "Country" IS NOT NULL AND TRIM("Country"::TEXT) != '')::BIGINT as unique_countries,
    COUNT(DISTINCT TRIM("Region"::TEXT)) FILTER (WHERE "Region" IS NOT NULL AND TRIM("Region"::TEXT) != '')::BIGINT as unique_regions,
    COUNT(*) FILTER (
      WHERE "Voluntary Status" IS NOT NULL 
      AND (
        LOWER(TRIM("Voluntary Status"::TEXT)) LIKE '%active%' 
        OR LOWER(TRIM("Voluntary Status"::TEXT)) LIKE '%registered%'
        OR LOWER(TRIM("Voluntary Status"::TEXT)) LIKE '%verified%'
      )
    )::BIGINT as active_projects
  FROM filtered_projects;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions (if not already granted)
GRANT EXECUTE ON FUNCTION get_distinct_regions() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_distinct_countries() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_distinct_voluntary_statuses() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_distinct_voluntary_registries() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_distinct_areas_of_interest() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_country_counts TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_region_counts TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_status_counts TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_project_stats TO authenticated, anon;
