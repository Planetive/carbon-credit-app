-- Insert USA CCUS Regulatory Landscape
-- This migration adds the Current Regulatory Landscape for the United States

-- Delete existing USA entry if it exists
DELETE FROM ccus_management_strategies WHERE country = 'United States' OR country = 'USA' OR country = 'US';

-- Insert new USA regulatory landscape data
INSERT INTO ccus_management_strategies (
    country,
    current_management_strategy,
    deployment_policies_and_programs,
    priorities_going_forward
) VALUES (
    'United States',
    'a. EPA UIC Class VI (Geologic Sequestration Wells)

• Federal permitting regime under the Safe Drinking Water Act.
• Governs site characterization, well construction, injection operations, monitoring, financial assurance, and closure.
• Critical path requirement for all commercial CO₂ storage.
• Includes state "primacy" pathways (e.g., ND, WY, LA).

b. EPA GHGRP (Greenhouse Gas Reporting Program) – 40 CFR Part 98

• Mandatory MRV and reporting for CO₂ capture, transport, injection, and storage.
• Subpart RR (geologic sequestration), Subpart UU (injection), Subpart PP (suppliers of CO₂).
• GHGRP data is the backbone for credit claims and auditability.

c. IRS 45Q Compliance Requirements

• Defines what counts as "qualified carbon oxide," eligible facilities, and the requirements for secure geologic storage or qualified utilization.
• Requires robust MRV alignment with EPA GHGRP.
• Includes wage & apprenticeship labor conditions for higher credit values.

d. IRS LCA Requirements (Notice 2024-60)

• Applies to CO₂ utilization pathways.
• Defines the approved life-cycle analysis methodologies and documentation.
• Required for claiming the utilization-tier 45Q credit.

e. NEPA (National Environmental Policy Act)

• Triggered for federally funded projects or projects requiring federal permits (DOE funding, pipelines crossing federal lands, etc.).
• Adds environmental review and community engagement requirements.

f. Pipeline Safety Regulations (PHMSA)

• Federally regulates CO₂ pipeline construction, operations, emergency response, and safety standards.
• Increasingly important as CO₂ transport networks expand.',
    'a. Federal Tax Incentive – Section 45Q

• Per-tonne tax credit for CO₂ captured and either:
 • stored geologically,
 • used in DAC, or
 • used in approved utilization pathways.
• Includes enhanced rates under the Inflation Reduction Act.
• Delivery mechanisms: Direct Pay (for some entities) and Transferability (sale of credits to third parties).

b. Bipartisan Infrastructure Law (BIL / IIJA) Funding Programs

• Includes multi-billion-dollar DOE programs:
 • CarbonSAFE (large-scale storage site development).
 • Carbon Storage Validation & Testing (site appraisal, characterization).
 • Capture demonstration projects (industrial, power, DAC).
 • Regional DAC hubs (multi-partner DAC ecosystems).
• Transport infrastructure funding for CO₂ pipeline development.

c. DOE Loan Programs Office (LPO)

• Loan guarantees for large-scale CCUS, CO₂ transport, and storage infrastructure.
• Reduces capital cost for pipelines and storage hubs.
• Accepts CCUS projects under the Title 17 Innovative Energy Loan Guarantee Program.

d. State-level Incentives & Primacy Programs

• Some states provide additional incentives (e.g., tax credits, severance exemptions, storage incentives).
• Class VI primacy states offer faster permitting timelines (ND, WY, LA), with more applications in progress.
• State-level liability, pore-space ownership, and unitization statutes support storage projects.

e. Federal Procurement / DOE Support Tools

• DOE technical assistance for storage characterization.
• Federal procurement of clean fuels and low-carbon materials indirectly supports CCUS-integrated supply chains (e.g., clean hydrogen requirements under 45V, SAF programs, clean steel initiatives).',
    'a. Expanding CO₂ Transport & Storage Networks

• Establishing large-scale, open-access CO₂ trunklines and commercial T&S networks.
• Developing standardized tariffs, commercial models, and risk-sharing for shared infrastructure.
• Increased public-private partnerships for backbone pipelines.

b. Streamlining Permitting & Increasing Class VI Capacity

• Hiring more EPA staff to reduce the queue for Class VI permits.
• Supporting more state primacy applications.
• Standardizing application templates and data requirements.

c. Strengthening MRV, Permanence, and Accounting Rules

• Modernizing GHGRP Part 98 with updated measurement technologies.
• Establishing clearer permanence, leakage, and monitoring rules for long-term storage.
• Improving digital data systems for CO₂ tracking from capture → transport → storage.

d. Market Infrastructure for Credit Monetization

• More transparent, standardized markets for transferring 45Q credits.
• Clearer rules for third-party intermediaries, escrow, and settlements.
• Building trusted registries to ensure credit integrity and reduce transaction risk.

e. Workforce & Supply Chain Development

• Expanding training programs for well drilling, pipeline construction, monitoring, and DAC manufacturing.
• Scaling supply chains for compressors, sorbents, membranes, monitoring equipment, and injection infrastructure.
• Ensuring prevailing wage and apprenticeship capacity to meet IRA requirements.

f. Long-term Liability & Stewardship Clarity

• Clarifying when and how long-term liability transfers from operators to states.
• Standardizing financial assurance requirements to lower uncertainty for lenders and insurers.
• Creating consistent post-closure care rules across states.'
);

