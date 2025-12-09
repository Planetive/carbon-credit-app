-- Insert/Update Jordan CCUS Regulatory Landscape
-- This migration adds/updates CCUS data for Jordan

-- Delete existing Jordan entry if it exists
DELETE FROM ccus_management_strategies WHERE country = 'Jordan';

-- Insert new Jordan regulatory landscape data
INSERT INTO ccus_management_strategies (
    country,
    current_management_strategy,
    deployment_policies_and_programs,
    priorities_going_forward
) VALUES (
    'Jordan',
    'Very early stage. There is recognition of CCS as a potential tool, but no active national program, major CCUS deployment, or robust regulatory framework yet.',
    NULL,
    NULL
);

