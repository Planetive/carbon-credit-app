-- Insert/Update India CCUS Regulatory Landscape
-- This migration adds/updates CCUS data for India

-- Delete existing India entry if it exists
DELETE FROM ccus_management_strategies WHERE country = 'India';

-- Insert new India regulatory landscape data
INSERT INTO ccus_management_strategies (
    country,
    current_management_strategy,
    deployment_policies_and_programs,
    priorities_going_forward
) VALUES (
    'India',
    'a. Launching the National CCUS Mission

• The mission would include viability gap funding (VGF), carbon pricing / carbon trading, and Production-Linked Incentives (PLIs) to support CCUS deployment.
• As part of the mission, the government reportedly wants to support pilot plants that can capture ~500 tonnes CO₂/day.

b. Proposed setting up a Carbon Capture Finance Corporation of India

• This institutional mechanism to support CCUS project funding, capital and cash costs which could include subsidies for CO₂ sequestration/storage at Rupees 4,100/mt up to 2040 and Rupees 3,000/mt up to 2050, and for CO₂ EOR at Rupees 3,000/mt to 2040 and Rupees 2,400/mt to 2050.',
    NULL,
    NULL
);

