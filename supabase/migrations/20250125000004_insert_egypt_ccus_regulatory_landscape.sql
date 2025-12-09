-- Insert/Update Egypt CCUS Regulatory Landscape
-- This migration adds/updates CCUS data for Egypt

-- Delete existing Egypt entry if it exists
DELETE FROM ccus_management_strategies WHERE country = 'Egypt';

-- Insert new Egypt regulatory landscape data
INSERT INTO ccus_management_strategies (
    country,
    current_management_strategy,
    deployment_policies_and_programs,
    priorities_going_forward
) VALUES (
    'Egypt',
    '1) Current Regulatory & Strategic Landscape

a. Hydrogen Strategy

• Egypt has adopted a National Low‑Carbon Hydrogen Strategy.
• This strategy explicitly includes blue hydrogen (i.e., using fossil-based H₂ + CCUS) as part of its hydrogen mix, underlining its relevance to CCUS.
• The government expects to scale hydrogen production, including exports, and sees CCUS as a lever to support that.',
    'a. Pilot Project with Eni

• Egypt and Eni (Italy) are working on a CCS project in the Meleiha field. The project (USD ~ 25 million) is expected to capture ~25,000–30,000 tonnes of CO₂ per year.

b. Technical & Economic Roadmaping

• Talks about developing a technical & economic roadmap for CCS.

c. Green Hydrogen Hub & Export Ambition

• The low-carbon hydrogen strategy is a core part of Egypt''s CCUS thinking, since hydrogen production can be paired with CO₂ capture / storage to support both decarbonization and export.',
    'a. Scale CCS Infrastructure

• Identify and develop CO₂ storage sites (especially offshore in the Nile Delta) through more detailed geological work (e.g., building on the Nile Delta screening project).
• Create CO₂ hubs that support both domestic capture (e.g., from industrial or hydrogen sources) and possibly export ("CO₂‑to-storage" value chain).

b. Hydrogen + CCUS Integration

• Use CCUS in blue hydrogen plants to reduce emissions, while exporting hydrogen (or its derivatives).
• Encourage private investment in hydrogen + CCS projects, leveraging Egypt''s low-cost renewables and strategic location.

c. Institutional & Regulatory Framework Development

• Build a clear regulatory framework for CCS / CCUS (licensing, monitoring, long-term storage liability). The MoU with Greece suggests they are looking at modeling regulatory frameworks.
• Establish an economic and environmental governance structure for CCS deployment.'
);

