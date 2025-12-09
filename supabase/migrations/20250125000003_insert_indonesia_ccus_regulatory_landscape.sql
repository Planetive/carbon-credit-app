-- Insert/Update Indonesia CCUS Regulatory Landscape
-- This migration adds/updates CCUS data for Indonesia

-- Delete existing Indonesia entry if it exists
DELETE FROM ccus_management_strategies WHERE country = 'Indonesia';

-- Insert new Indonesia regulatory landscape data
INSERT INTO ccus_management_strategies (
    country,
    current_management_strategy,
    deployment_policies_and_programs,
    priorities_going_forward
) VALUES (
    'Indonesia',
    '1) Current Regulatory & Strategic Landscape

a. Regulation

• Indonesia has established formal CCS regulation:
 • MEMR Regulation No. 2/2023 defines CCS and CCUS in upstream oil & gas work areas, covering capture, transport, storage, and utilization.
 • Presidential Regulation No. 14/2024 further formalizes CCS: it designates permitted CCS areas, outlines licensing procedures, storage rights, and allows cross-border CO₂ transport/storage.

b. Standards

• Indonesia''s national standards body (BSN) is also developing CCS standards, building off ISO.',
    'a. CCS Hub Development

• Pertamina, ExxonMobil, and KNOC signed a framework agreement to develop a CCS hub in the Sunda‑Asri basins (Java Sea).
• The regulation under Perpres 14/2024 allows CCS operators to reserve 30% of their storage capacity for imported CO₂.',
    'a. Establish Designated CCS Storage Areas

• Under PR 14/2024, the government will designate specific CCS license areas ("WIPK") for exploration and storage.

b. Implement a CCS Permit System with Clear Regulation

• Implement both exploration permits (6+4 years) and operation permits (up to 30 + 20 years) under the regulation.
• Require MRV (measurement, reporting, verification) for CCS operations, including independent verification.

c. Prioritize Domestic CO₂ Before Cross-Border

• PR 14/2024 requires that CCS license holders allocate at least 70% of their storage capacity to domestic CO₂ sources, reserving up to 30% for foreign CO₂.
• This reflects a priority for serving Indonesia''s own emitters before using storage for imported CO₂.

d. Support CCS Hub Development

• The state aims to develop a large-scale CCS hub in the Sunda-Asri Basin (Java Sea), leveraging Indonesia''s potential geological storage (depleted reservoirs, aquifers).'
);

