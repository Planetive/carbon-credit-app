#!/usr/bin/env python3
"""
Database exploration script
"""

import os
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

# Create client
client = create_client(
    "https://yhticndmpvzczquivpfb.supabase.co",
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

print("=== DATABASE EXPLORATION ===")
print("=" * 50)

# Get all table names
tables = [
    'profiles', 'contact_submissions', 'carbon_projects_details', 'project_input',
    'ccus_projects', 'ccus_policies', 'ccus_management_strategies', 'esg_assessments',
    'esg_scores', 'scope1_fuel_entries', 'scope1_refrigerant_entries',
    'scope1_passenger_vehicle_entries', 'scope1_delivery_vehicle_entries',
    'counterparties', 'exposures', 'counterparty_questionnaires',
    'emission_calculations', 'scenario_runs', 'scenario_results'
]

for table in tables:
    try:
        result = client.table(table).select("*").limit(5).execute()
        count = len(result.data)
        print(f"\n{table}:")
        print(f"  - Records found: {count}")
        if count > 0:
            print(f"  - Sample record keys: {list(result.data[0].keys())}")
    except Exception as e:
        print(f"\n{table}: Error - {e}")

print("\n" + "=" * 50)
print("=== SUMMARY ===")

# Get counts for all tables
total_records = 0
for table in tables:
    try:
        result = client.table(table).select("id", count="exact").execute()
        count = result.count if result.count else len(result.data)
        total_records += count
        print(f"{table}: {count} records")
    except Exception as e:
        print(f"{table}: Error accessing table")

print(f"\nTotal records across all tables: {total_records}")
