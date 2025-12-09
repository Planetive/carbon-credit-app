-- Update United Kingdom CCUS Regulatory Landscape
-- This migration updates the Current Regulatory Landscape and adds Priorities Going Forward for UK

UPDATE ccus_management_strategies
SET 
  current_management_strategy = '• UK has committed substantial public finance: as part of its "Net Zero Growth Plan," the government announced up to £20 billion investment in CCUS infrastructure.

• The Net Zero Investment Roadmap (April 2023) sets out UK ambition to support 4 CCUS clusters and aims to capture 20–30 MtCO₂/year by 2030.

• The UK''s "Vision to establish a competitive market" outlines business‑model targets: the government aims for 6 Mt CO₂ industrial CCUS by 2030 and 9 Mt by 2035, with a pathway toward 10 Mt/year.

• For CCUS infrastructure, the UK has developed a CCS Network Code, which defines the transport & storage commercial framework. The updated network code was released in January 2025.

• On non-pipeline CO₂ transport (i.e., ship, rail, road), the government is developing a policy: a "call for evidence" was published, and its responses will inform a consultation (2025) on non-pipeline transport.

• The UK has established a CCUS Council (as of June 2025), bringing together senior representatives from government and industry to oversee progress and set priorities.

' || COALESCE(current_management_strategy, ''),
  priorities_going_forward = 'a. Scale-up of CCUS Clusters

• Expand Track‑1 clusters (HyNet, East Coast) and move decisively into Track‑2 clustering (e.g., Humber, Acorn).

b. Develop Non-Pipeline CO₂ Transport

• Continue development of non-pipeline transport policy and infrastructure.

c. Innovation & Next‑Gen Capture Technologies

• Scale-up RD&D funding, especially through the "Innovation 2.0" programme, to lower the cost of capture.

d. Regulatory Certainty & Market Mechanisms

• Maintain and refine the CCS Network Code, ensuring clear and fair access, tariffs, and commercial terms for T&S.

e. Integration with Hydrogen Strategy

• Align CCUS with the UK''s hydrogen goals: CCUS-enabled hydrogen (blue hydrogen) is likely to be important for the UK''s 10 GW hydrogen ambition.

f. Long-Term Market Transition

• DESNZ outlines a three-phase "Market Transition" for CCUS:
 • Market creation (to 2030)
 • Transition (to 2035)
 • Self-sustaining (from 2035 onward)'
WHERE country = 'United Kingdom' OR country = 'UK';

