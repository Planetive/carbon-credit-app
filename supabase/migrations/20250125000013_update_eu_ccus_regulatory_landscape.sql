-- Update European Union CCUS Regulatory Landscape
-- This migration updates the Current Regulatory Landscape, Deployment Policies & Programs, and Priorities Going Forward for EU

UPDATE ccus_management_strategies
SET 
  current_management_strategy = '1) Current Regulatory Landscape (EU)

These are the laws, strategies and regulatory frameworks that provide the foundation for CCUS in the EU.

a. CCS Directive (Directive 2009/31/EC)

• The Geological Storage of Carbon Dioxide Directive regulates how CO₂ can be stored underground in the EU: it sets out site permitting, monitoring, post‑closure obligations, financial assurance, and environmental safeguard requirements.

b. Industrial Carbon Management (ICM) Strategy

• In February 2024, the European Commission launched an Industrial Carbon Management (ICM) Strategy. This strategy aims to build a "single market" for CO₂ transport and storage in the EU by 2030.
• The ICM Strategy explicitly covers CCS, CCU (utilisation), and carbon removal (e.g., bioenergy CCS, DACCS).
• Through this strategy, the EU seeks to align CO₂ infrastructure development, regulation, and market mechanisms across member states.

c. Net-Zero Industry Act (NZIA)

• The NZIA (Regulation (EU/2024/1735)), which entered into force in June 2024, sets an EU-wide CO₂ storage target of 50 million tonnes per year by 2030.
• Under this regulation, certain obligations are placed on oil and gas producers licensed under the EU Hydrocarbons Directive: they must contribute to storage development, either by building storage themselves or by partnering with storage developers.

d. EU Emissions Trading System (EU ETS)

• The EU ETS is part of the CCUS regulatory mix: emissions from certain industrial sectors are covered, and CCS is explicitly mentioned in the ETS framework as a way to reduce needed allowances / avoid surrender.
• Captured CO₂ that is permanently stored can reduce the effective emissions from those installations, acting as an incentive for CCS from a compliance perspective.

e. Carbon Removals & Carbon Farming Certification Regulation

• The EU has adopted a Carbon Removals & Carbon Farming Regulation (CRCF). This regulation provides a voluntary, EU‑wide framework for certifying carbon removals (including stored CO₂ and CO₂ stored in products).
• It sets criteria for removals, MRV (monitoring, reporting, verification), and thus supports a regulated market for "carbon removal credits."

' || COALESCE(current_management_strategy, ''),
  deployment_policies_and_programs = '2) Deployed Policies & Programs in Place (EU)

a. Innovation Fund

• One of the EU''s primary financial instruments for innovative low-carbon technologies; supports CCS, CCU, and carbon removal projects.
• Following an ETS Directive revision, the Fund was strengthened: more allowances, expanded sectors, and a competitive bidding mechanism.

b. SET-Plan – CCS/CCU Implementation Working Group

• Under the EU''s Strategic Energy Technology Plan (SET-Plan), there is a working group on CCS‑CCU focused on R&D, technology scaling, and research collaboration across member states.

c. State Aid / Industrial Support

• While not always CCS‑specific, the EU''s broader Clean Industrial Solutions Act (state aid framework) supports clean technologies, including CCUS, by de-risking investments (though specific mechanisms may depend on member states or additional EU instruments).

d. Carbon Infrastructure Planning & TEN‑E / CEF Support

• The EU is mapping CO₂ transport infrastructure needs and cross-border CO₂ networks as part of its ICM Strategy.
• The Connecting Europe Facility (CEF) for Energy is one of the relevant funding channels for CO₂ infrastructure (transport, storage) under cross-border and trans‑European energy projects. (Referenced by CCUS‑incentive trackers.)

' || COALESCE(deployment_policies_and_programs, ''),
  priorities_going_forward = '3) Priorities Going Forward

a. Implementing the ICM Strategy and Building a EU Single CO₂ Market

• Advance cross‑EU CO₂ transport and storage networks to realize the ICM Strategy''s vision of a single market for CO₂ transport and storage by 2030.

b. Scaling Storage Capacity to Meet the NZIA 2030 Target

• Meet and exceed the 50 Mt CO₂ injection capacity by 2030 target set by the Net-Zero Industry Act (NZIA).
• Mobilise oil & gas companies operating under existing hydrocarbon licenses to invest in storage development (as mandated by NZIA).

c. Support for Carbon Removal Technologies (BECCS, DAC, CCU)

• Foster carbon removal applications under ICM (e.g., biomass CCS, DACCS) to deliver negative emissions.
• Deploy the Carbon Removals & Carbon Farming Certification (CRCF) framework to create a trusted market for removals and promote high-quality credits.

d. Streamlined Permitting & Regulatory Certainty

• Further refine and harmonize CCS Directive implementation in member states (including via updated guidance) to lower permitting risk and accelerate deployment. (Already underway via 2024 guidance.)

e. Financing & Market Instruments

• Create or enhance market instruments for CCUS deployment: CCfD (Carbon Contracts for Difference), guarantees, or dedicated CCS financing vehicles. Indeed, industry groups (IOGP) have proposed a "European CCS Bank" under the Innovation Fund.

f. Industrial Decarbonization – Hard‑to‑Abate Sectors

• Use CCUS to decarbonize key heavy industries (cement, steel, chemicals, refineries) by combining capture with EU emissions regulation and infrastructure scale-up.

' || COALESCE(priorities_going_forward, '')
WHERE country = 'European Union' OR country = 'EU';

