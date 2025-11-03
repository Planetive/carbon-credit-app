#!/usr/bin/env python3
"""
Detailed database data exploration
"""

import os
from dotenv import load_dotenv
from supabase import create_client
import json

# Load environment variables
load_dotenv()

# Create client
client = create_client(
    "https://yhticndmpvzczquivpfb.supabase.co",
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

print("=== DETAILED DATABASE DATA ===")
print("=" * 60)

# 1. User Profiles
print("\n1. USER PROFILES:")
print("-" * 30)
profiles = client.table("profiles").select("*").execute()
for profile in profiles.data[:3]:
    print(f"ID: {profile['id']}")
    print(f"Organization: {profile.get('organization_name', 'N/A')}")
    print(f"Display Name: {profile.get('display_name', 'N/A')}")
    print(f"Phone: {profile.get('phone', 'N/A')}")
    print(f"Created: {profile['created_at']}")
    print()

# 2. Contact Submissions
print("\n2. CONTACT SUBMISSIONS:")
print("-" * 30)
contacts = client.table("contact_submissions").select("*").execute()
for contact in contacts.data:
    print(f"Name: {contact['name']}")
    print(f"Email: {contact['email']}")
    print(f"Company: {contact.get('company', 'N/A')}")
    print(f"Subject: {contact['subject']}")
    print(f"Status: {contact['status']}")
    print(f"Message: {contact['message'][:100]}...")
    print()

# 3. CCUS Projects (sample)
print("\n3. CCUS PROJECTS (Sample):")
print("-" * 30)
ccus_projects = client.table("ccus_projects").select("*").limit(3).execute()
for project in ccus_projects.data:
    print(f"Project Name: {project.get('Project name', 'N/A')}")
    print(f"Country: {project.get('Country or economy', 'N/A')}")
    print(f"Project Type: {project.get('Project type', 'N/A')}")
    print(f"Status: {project.get('Project Status', 'N/A')}")
    print(f"Capacity: {project.get('Announced capacity (Mt CO2/yr)', 'N/A')}")
    print()

# 4. ESG Assessments
print("\n4. ESG ASSESSMENTS:")
print("-" * 30)
esg_assessments = client.table("esg_assessments").select("*").execute()
for assessment in esg_assessments.data:
    print(f"User ID: {assessment['user_id']}")
    print(f"Status: {assessment['status']}")
    print(f"Environmental Completion: {assessment['environmental_completion']}%")
    print(f"Social Completion: {assessment['social_completion']}%")
    print(f"Governance Completion: {assessment['governance_completion']}%")
    print(f"Total Completion: {assessment['total_completion']}%")
    print()

# 5. Emission Calculations
print("\n5. EMISSION CALCULATIONS:")
print("-" * 30)
emissions = client.table("emission_calculations").select("*").execute()
for emission in emissions.data[:3]:
    print(f"Calculation Type: {emission['calculation_type']}")
    print(f"Company Type: {emission['company_type']}")
    print(f"Financed Emissions: {emission['financed_emissions']}")
    print(f"Status: {emission['status']}")
    print(f"Formula ID: {emission['formula_id']}")
    print()

# 6. Counterparties and Exposures
print("\n6. COUNTERPARTIES & EXPOSURES:")
print("-" * 30)
counterparties = client.table("counterparties").select("*").execute()
for counterparty in counterparties.data:
    print(f"Name: {counterparty['name']}")
    print(f"Sector: {counterparty['sector']}")
    print(f"Geography: {counterparty['geography']}")
    print(f"Type: {counterparty['counterparty_type']}")
    print()

exposures = client.table("exposures").select("*").execute()
for exposure in exposures.data:
    print(f"Exposure ID: {exposure['exposure_id']}")
    print(f"Amount (PKR): {exposure['amount_pkr']}")
    print(f"Probability of Default: {exposure['probability_of_default']}")
    print(f"Loss Given Default: {exposure['loss_given_default']}")
    print()

print("\n" + "=" * 60)
print("DATABASE SUMMARY COMPLETE")
