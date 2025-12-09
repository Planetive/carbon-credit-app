-- Insert/Update Morocco CCUS Regulatory Landscape
-- This migration adds/updates CCUS data for Morocco

-- Delete existing Morocco entry if it exists
DELETE FROM ccus_management_strategies WHERE country = 'Morocco';

-- Insert new Morocco regulatory landscape data
INSERT INTO ccus_management_strategies (
    country,
    current_management_strategy,
    deployment_policies_and_programs,
    priorities_going_forward
) VALUES (
    'Morocco',
    'There is nascent CCUS interest, especially on the research / capacity-building side, but no fully mature or large-scale CCUS deployment or comprehensive policy framework currently in place.',
    NULL,
    NULL
);

