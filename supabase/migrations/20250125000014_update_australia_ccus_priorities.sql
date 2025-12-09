-- Update Australia CCUS Priorities Going Forward
-- This migration updates the Priorities Going Forward section for Australia

UPDATE ccus_management_strategies
SET priorities_going_forward = 'a. Scaling Offshore & Onshore CO₂ Storage Capacity

• Australia is continuing to release offshore greenhouse gas storage acreage (including in its offshore basins) to support large-scale CO₂ injection.
• Strengthen and refine the regulatory regime to support more offshore storage safely (the Offshore Petroleum and Greenhouse Gas Storage Act + new regulations for environmental management, safety, and levies).
• Explore and accelerate the development of major multi-user CO₂ storage hubs, especially in basins that are geologically well-suited. (GA indicates many basins have strong storage potential.)

b. Policy Certainty & Regulatory Reform

• Improve regulatory clarity for storage and transport: Australia''s Future Gas Strategy emphasizes that regulatory systems need to remain "fit-for-purpose" and be reviewed.
• Establish and scale a national CCUS / CCS strategy: Several stakeholders (industry, researchers) argue that a coordinated national CCUS framework (with unified targets, funding plans, and policy signals) is needed.

c. Innovation in Capture Technologies

• Continue to support R&D for carbon capture / utilisation technologies via grants and programs. Although older programs (like the Hubs & Technologies Program) have closed, the government has previously funded innovation and may reallocate or redesign these supports.
• Encourage emerging capture tech (e.g., DAC, BECCS) and new CO₂ utilisation pathways (e.g., producing building materials, fuels) to expand market opportunity.
• Leverage CO₂ storage expertise to serve both domestic decarbonisation and possible future CO₂ import/export markets (geological capacity + infrastructure). CSIRO has pointed to Australia''s potential to become a CO₂ hub for the region.

d. Community, Indigenous & Stakeholder Engagement

• Build social license for CO₂ storage: involve local communities, particularly Indigenous stakeholders, in hub planning, permitting, and long-term monitoring. (Seen in WA''s CCUS Action Plan).

e. Infrastructure & Hub Development

• Develop multi-user transport and storage hubs, especially in regions that enable CO₂ from various emitters (industrial, hydrogen, power) to be injected into shared storage.

f. Exporting Storage Services ("CO₂ Hub for the Region")

• Capitalise on Australia''s large geological storage capacity to export CO₂ storage services to other countries in the Asia‑Pacific region. CSIRO and others see Australia as a potential CO₂ "sink hub" for cross-border CO₂.

g. Decarbonising Hard-to-Abate Industries

• Use CCS to decarbonise emissions-intensive sectors (cement, steel, chemicals, fertiliser, natural gas processing) by integrating capture and storage into industrial processes.

h. Strengthening National Targets & Integration

• Align CCUS deployment with Australia''s Net Zero Plan and sectoral decarbonisation strategies: CCUS must become a central part of Australia''s roadmap to net zero by 2050.'
WHERE country = 'Australia';

