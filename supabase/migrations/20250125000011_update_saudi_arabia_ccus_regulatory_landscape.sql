-- Update Saudi Arabia CCUS Regulatory Landscape
-- This migration updates the Current Regulatory Landscape and Deployment Policies & Programs for Saudi Arabia

UPDATE ccus_management_strategies
SET 
  current_management_strategy = 'a. Circular Carbon Economy (CCE) Framework

• Saudi Arabia strongly frames its CCUS strategy within a "Circular Carbon Economy" (CCE) model.

b. National CCUS Ambition / Target

• The Kingdom aims to capture 44 Mt CO₂/year by 2035.

' || COALESCE(current_management_strategy, ''),
  deployment_policies_and_programs = 'a. Aramco CCUS Hub in Jubail

• The Jubail hub is a flagship project. Aramco has committed to capturing 9 Mt CO₂/year by 2027.

b. Aramco''s Internal CCUS Roadmap

• Aramco''s carbon management roadmap includes not just point‑source capture, but capture + transport + storage, plus utilization.

c. International Engagement

• Saudi is engaging in international CCUS initiatives; for example, contributing to MRV (monitoring, reporting, verification) development and participating in global CCUS policy forums.

' || COALESCE(deployment_policies_and_programs, '')
WHERE country = 'Saudi Arabia';

