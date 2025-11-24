-- Add indexes to global_projects table for performance optimization
-- These indexes will dramatically speed up filter queries and aggregations

-- Indexes for filter columns (most frequently queried)
CREATE INDEX IF NOT EXISTS idx_global_projects_region ON global_projects("Region");
CREATE INDEX IF NOT EXISTS idx_global_projects_country ON global_projects("Country");
CREATE INDEX IF NOT EXISTS idx_global_projects_voluntary_status ON global_projects("Voluntary Status");
CREATE INDEX IF NOT EXISTS idx_global_projects_voluntary_registry ON global_projects("Voluntary Registry");
CREATE INDEX IF NOT EXISTS idx_global_projects_area_of_interest ON global_projects("Area of Interest");

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_global_projects_region_country ON global_projects("Region", "Country");

-- Index for NULL filtering (helps with queries that filter out empty values)
CREATE INDEX IF NOT EXISTS idx_global_projects_region_not_null ON global_projects("Region") WHERE "Region" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_global_projects_country_not_null ON global_projects("Country") WHERE "Country" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_global_projects_status_not_null ON global_projects("Voluntary Status") WHERE "Voluntary Status" IS NOT NULL;

-- Analyze table to update statistics for query planner
ANALYZE global_projects;

