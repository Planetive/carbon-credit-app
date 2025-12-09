-- Insert/Update Algeria CCUS Regulatory Landscape
-- This migration adds/updates CCUS data for Algeria

-- Delete existing Algeria entry if it exists
DELETE FROM ccus_management_strategies WHERE country = 'Algeria';

-- Insert new Algeria regulatory landscape data
INSERT INTO ccus_management_strategies (
    country,
    current_management_strategy,
    deployment_policies_and_programs,
    priorities_going_forward
) VALUES (
    'Algeria',
    'Algeria does not currently have a mature, large-scale deployed CCUS / CCS policy or infrastructure, but there is strategic momentum.

The strongest lever appears to be hydrogen‑CCUS integration, especially via blue hydrogen export strategy.',
    NULL,
    NULL
);

