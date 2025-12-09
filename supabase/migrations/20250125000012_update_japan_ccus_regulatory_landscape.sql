-- Update Japan CCUS Regulatory Landscape
-- This migration updates the Current Regulatory Landscape, Deployment Policies & Programs, and Priorities Going Forward for Japan

UPDATE ccus_management_strategies
SET 
  current_management_strategy = 'a. Act on Carbon Dioxide Storage Business ("CCS Business Act")

• In May 2024, Japan enacted a new Act on Carbon Dioxide Storage Business. This creates a licensing system for CO₂ storage operators, including rights and obligations for transportation and storage.

b. Long-Term CCS Roadmap (Government / MOE)

• Japan''s CCS Long-Term Roadmap sets out a target of 120–240 million tonnes of CO₂ stored by 2050.
• Near-term objective: business environment readiness by 2030, including cost reduction, public acceptance, and regulatory setup.
• The roadmap also explicitly includes "promotion of overseas CCS business" as a pillar.

c. International / Cross-Border Framework

• Japan is promoting cross-border CO₂ transport and storage: in October 2023, METI, JOGMEC (Japan Organization for Metals & Energy Security), and Malaysia''s PETRONAS signed a Memorandum of Cooperation (MoC) on transboundary CO₂ transport/storage.

d. Social / Environmental Regulation

• The Ministry of the Environment (MOE) is actively promoting social implementation of CCS: for example, in March 2025, it held a CCS International Symposium focused on public engagement, monitoring, and environmental risk.

' || COALESCE(current_management_strategy, ''),
  deployment_policies_and_programs = 'a. Advanced CCS Projects (JOGMEC / METI)

• In FY2023, JOGMEC selected 7 "Advanced CCS Projects" aimed at building role-model CCS value chains (capture, transport, storage).
• In FY2024, they selected 9 additional projects, spread across various industries (power, steel, chemicals, cement) and regions (Hokkaido, Kanto, Kyushu, etc.).
• Target for 2030: these projects aim to design the full CCS chain and evaluate storage capacity.
• Some of these projects plan to store CO₂ domestically; others plan to ship CO₂ for storage in the Asia-Pacific region.

b. Financial / Institutional Support (JOGMEC)

• JOGMEC provides priority support for selected projects: design work, storage evaluation, and value-chain studies.

c. International Cooperation / Regional Forums

• Japan is active in the Asia CCUS Network. In September 2025, METI and ERIA held the Fifth Asia CCUS Network Forum, discussing cross-border transport, storage, and regional CCUS cooperation.

d. Public Engagement & Monitoring

• The CCS International Symposium (March 2025) by MOE is part of the government''s efforts to engage local governments, communities, and industry on CCS risk, monitoring, and acceptance.
• There is an emphasis on educational outreach, MRV (monitoring, reporting, verification), and environmental monitoring.

' || COALESCE(deployment_policies_and_programs, ''),
  priorities_going_forward = 'a. Commercialization by 2030

• Move from demonstration ("Advanced CCS Projects") to commercial-scale CCS business. The 2024‑project selections are explicitly meant to become horizontally replicable business models.
• Final investment decisions (FID) for many of the selected projects are expected by FY2026, according to METI.
• Increase domestic storage capacity: aiming for 6–12 Mt CO₂ storage per year by 2030 from the advanced projects.

b. Cost Reduction & Risk Mitigation

• Reduce the cost of CCS through design, economies of scale, and shared infrastructure. The policy roadmap emphasizes cost reduction as a core pillar.
• Promote business models that spread risk, including public support (equity, guarantees) and multi‑industry shared value chains.

c. Cross-Border CO₂ Transport & Storage

• Scale international CCS partnerships. The MoC with PETRONAS is a concrete step, but more bilateral (or multilateral) deals are likely needed.
• Promote shipping of CO₂ from Japan to overseas storage sites where domestic geology is insufficient.

d. Public Acceptance & Environmental Monitoring

• Build social license for large-scale CCS: engage local and regional stakeholders, clarify environmental safety, and communicate monitoring plans.

e. Long-Term Storage Ambition

• By 2050, aim to have stored 120–240 Mt CO₂, per the CCS roadmap.

f. Integration with Broader Net-Zero Strategy

• Align CCS deployment with Japan''s Green Transformation (GX) Strategy and broader decarbonization policies.
• Use CCS to decarbonize hard-to-abate sectors: power, steel, chemicals, cement, etc., via the selected advanced projects.

g. Mobilizing Private and Institutional Capital

• Encourage equity investment, debt, and guarantees from both public (JOGMEC) and private sources.

' || COALESCE(priorities_going_forward, '')
WHERE country = 'Japan';

