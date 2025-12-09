-- Update Canada CCUS Regulatory Landscape
-- This migration updates the Deployment Policies & Programs for Canada

UPDATE ccus_management_strategies
SET 
  deployment_policies_and_programs = 'a. CCUS Investment Tax Credit (ITC)

• A refundable tax credit for qualified CCUS expenditures.
• Eligible from January 1, 2022 to December 31, 2040.
• Different credit rates depending on type of equipment:
 • 60% for capture equipment used in direct air capture (DAC) projects.
 • 50% for other capture equipment.
 • 37.5% for transportation, storage, and utilization equipment (for the period up to 2030).
• After 2030 (specifically 2031–2040): rates are reduced. E.g., for capture (non-DAC) it goes down to 25%, and transport/storage/use goes to 18.75%.
• Not all uses of CO₂ are eligible: eligible uses include geological storage and concrete sequestration. Enhanced Oil Recovery (EOR) is not eligible.
• There are labour conditions: according to EY, certain labour-standards (e.g., possibly prevailing wage or apprenticeship) must be met to get full credit rates; otherwise, credit rates can be reduced.
• For companies claiming it, they must submit a CCUS project plan to NRCan for evaluation.

b. Federal RD&D (Research, Development & Demonstration) Funding via Energy Innovation Program (EIP)

• NRCan''s Carbon Management Strategy includes public funding support for CCUS R&D.
• Specifically: In February 2025, the government announced ~ CAD 3.4 million to Canada Nickel for its in-process tailings (IPT) carbonation technology, via the EIP CCUS Research, Development, Demonstration call.
• Earlier, Budget 2021 had committed CAD 319 million over 7 years for CCUS R&D, including pilot and demonstration.

c. Clean Economy Investment Tax Credits (Broader Framework)

• The CCUS ITC is part of a suite of "Clean Economy ITCs," which also support clean tech, hydrogen, and clean technology manufacturing.
• Budget 2025 proposes to extend full CCUS ITC rates beyond the originally planned window. Some commentary suggests an extension of "full rates" credit period.

d. Canada Growth Fund (CGF) / Public-Private Financing

• The Canada Growth Fund (a government-backed clean technology finance vehicle) is backing large CCUS projects. For example: Oil producer Strathcona Resources is partnering with CGF to build CCS infrastructure in Saskatchewan and Alberta.
• There are carbon credit offtake guarantees: CGF signed a deal to guarantee a price for captured carbon in a waste-to-energy + CCS project.

e. Provincial / Sub-National CCUS Support (Some Examples)

• Saskatchewan: has its own CCUS initiative.
• Alberta Carbon Trunk Line (ACTL): a major CO₂ pipeline / transport infrastructure project.
• British Columbia: BC''s Low Carbon Fuel Standard (LCFS) includes incentives that may support CO₂ utilization in fuels.

f. Carbon Management Strategy

• The Government of Canada has a Carbon Management Strategy (through NRCan) that identifies CCUS as a key technology to reach net-zero goals and supports its deployment via the above instruments.

' || COALESCE(deployment_policies_and_programs, '')
WHERE country = 'Canada';

