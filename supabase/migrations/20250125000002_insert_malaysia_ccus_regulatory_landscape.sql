-- Insert/Update Malaysia CCUS Regulatory Landscape
-- This migration adds/updates CCUS data for Malaysia

-- Delete existing Malaysia entry if it exists
DELETE FROM ccus_management_strategies WHERE country = 'Malaysia';

-- Insert new Malaysia regulatory landscape data
INSERT INTO ccus_management_strategies (
    country,
    current_management_strategy,
    deployment_policies_and_programs,
    priorities_going_forward
) VALUES (
    'Malaysia',
    '1) Current Regulatory & Strategic Landscape

a. National Energy Transition Roadmap (NETR)

• Malaysia''s NETR explicitly lists CCUS as one of the six key "energy transition levers."
• Under NETR, by 2030, Malaysia aims to develop 3 CCUS hubs (2 in Peninsular Malaysia, 1 in Sarawak) with ~15 Mtpa storage capacity.
• By 2050, the roadmap targets 40‑80 Mtpa storage capacity across CCUS hubs.

b. Legal Framework – CCUS Act 2025

• Legal framework established for CCUS regulation and governance.',
    'a. Investment Tax Allowance Incentives

• Under its CCUS strategy, Malaysia offers an Investment Tax Allowance (ITA): 100% of qualifying capex for CCS equipment for 10 years.
• There is import duty and sales tax exemption for CCS equipment (effective until end-2027).

b. Storage Assessment & Hub Development

• Plans for 3‑6 CCUS clusters supporting long-term storage development.

c. Agency & Governance

• MyCCUS (under Ministry of Economy) is driving CCUS roadmap, coordinating policy, regulation, and stakeholder engagement.

d. Project Development

• Petronas is partnering with ADNOC and Storegga to evaluate CCS in offshore Penyu Basin (Malaysia), targeting up to 5 Mt CO₂ / year by 2030.
• Petronas & JERA (Japan) are studying a CCS value-chain: capture in Japan, transport, and storage in Malaysia.',
    'a. Operationalize CCUS Regulation

• Implement and enforce provisions under the Carbon Capture, Utilisation & Storage Act (Act 870) to regulate capture, transport, storage, and post‑closure.

b. Develop CCUS Hubs as per NETR

• NETR identifies 3 CCUS hubs by 2030 (2 in Peninsular Malaysia, 1 in Sarawak) to deploy large-scale storage capacity.

c. Regional / Cross‑Border Cooperation

• Malaysia''s CCUS ambitions align with regional cooperation under ASEAN CCS deployment frameworks. The NETR and national policy emphasize the potential for cross-border collaboration on CO₂ storage.'
);

