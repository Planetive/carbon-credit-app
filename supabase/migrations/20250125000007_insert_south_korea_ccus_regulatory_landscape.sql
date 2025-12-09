-- Insert/Update South Korea CCUS Regulatory Landscape
-- This migration adds/updates CCUS data for South Korea

-- Delete existing South Korea entry if it exists
DELETE FROM ccus_management_strategies WHERE country = 'South Korea' OR country = 'Korea';

-- Insert new South Korea regulatory landscape data
INSERT INTO ccus_management_strategies (
    country,
    current_management_strategy,
    deployment_policies_and_programs,
    priorities_going_forward
) VALUES (
    'South Korea',
    'a. Carbon Capture, Usage, and Storage (CCUS) Act

• Under this Act, there are permitting processes, monitoring responsibilities, and certification of CCU products.

b. 2030 CCUS target

• In its 1st National Basic Plan for Carbon Neutrality and Green Growth, it raised its CCUS deployment target to 11.2 Mt CO₂/year by 2030.',
    'a. Pilot Projects

• A pilot is being developed: K-water, BKT, and Capture6 signed an MoU (January 2024) to build a DAC + CCS demonstration facility integrated with desalination, near the Daesan petrochemical industrial complex.

b. Financial Incentives

• The South Korean CCUS Act provides certain financial support.

c. Regulatory Certainty

• With the 2024 Act, the permitting regime is more clearly defined, which helps companies plan capture, transport, and storage investments.',
    'a. Scale CCUS Deployment

• Reach or exceed the 11.2 Mt/year target by 2030. Expand beyond pilots, especially in heavy‑industry hubs (steel, petrochemicals, chemicals).

b. Expand Demonstrations & Infrastructure

• Build more pilot / demonstration facilities, especially around CO₂ use (CCU) and direct air capture. Scale the DAC + CCS facility.

c. Develop CO₂ Transport & Storage Network

• Invest in CO₂ pipelines, storage sites (onshore/offshore), and share infrastructure. Ensure third‑party access frameworks.

d. Financial Mechanisms & Incentives

• Strengthen support (grants, tax incentives, low-interest loans) to offset retrofitting costs for industrial CCS and CO₂ capture.

e. International Collaboration

• Promote cross-border CCUS cooperation, especially for CO₂ storage and technology exchange.

f. Regulatory Strengthening and Certification

• Use the certification process to build a CO₂‑utilisation market; develop standard MRV (monitoring, reporting, verification) protocols.

g. Public & Stakeholder Engagement

• Engage local communities in storage development, and build social licenses for injection sites.

h. Integration with Korean Green Hydrogen Strategy

• Tie CCUS to hydrogen production where possible.'
);

