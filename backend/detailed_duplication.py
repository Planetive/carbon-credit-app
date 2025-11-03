#!/usr/bin/env python3
"""
Detailed duplication pattern analysis
"""

import os
from dotenv import load_dotenv
from supabase import create_client
from collections import defaultdict

# Load environment variables
load_dotenv()

# Create client
client = create_client(
    "https://yhticndmpvzczquivpfb.supabase.co",
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

print("=== DETAILED DUPLICATION PATTERN ANALYSIS ===")
print("=" * 70)

# Analyze emission_calculations in detail
print("\n🔍 DETAILED ANALYSIS: emission_calculations")
print("-" * 50)

emission_calc = client.table("emission_calculations").select("*").execute()
records = emission_calc.data

# Group by user_id to see patterns
user_groups = defaultdict(list)
for record in records:
    user_groups[record['user_id']].append(record)

for user_id, user_records in user_groups.items():
    print(f"\n👤 User: {user_id}")
    print(f"   Total calculations: {len(user_records)}")
    
    # Group by counterparty
    counterparty_groups = defaultdict(list)
    for record in user_records:
        counterparty_groups[record['counterparty_id']].append(record)
    
    for cp_id, cp_records in counterparty_groups.items():
        print(f"   🏢 Counterparty: {cp_id}")
        print(f"      Calculations for this counterparty: {len(cp_records)}")
        
        for i, record in enumerate(cp_records):
            print(f"      📊 Calculation {i+1}:")
            print(f"         Formula: {record['formula_id']}")
            print(f"         Type: {record['calculation_type']}")
            print(f"         Company Type: {record['company_type']}")
            print(f"         Financed Emissions: {record['financed_emissions']}")
            print(f"         Status: {record['status']}")
            print(f"         Created: {record['created_at']}")

# Check for potential issues
print(f"\n🚨 POTENTIAL ISSUES ANALYSIS:")
print("-" * 50)

# Check for same formula_id + counterparty_id combinations
formula_counterparty = defaultdict(list)
for record in records:
    key = f"{record['formula_id']}_{record['counterparty_id']}"
    formula_counterparty[key].append(record)

duplicates_found = False
for key, duplicate_records in formula_counterparty.items():
    if len(duplicate_records) > 1:
        duplicates_found = True
        print(f"⚠️  DUPLICATE: {key}")
        print(f"   Found {len(duplicate_records)} records with same formula + counterparty")
        for i, record in enumerate(duplicate_records):
            print(f"      Record {i+1}: ID={record['id']}, Created={record['created_at']}")

if not duplicates_found:
    print("✅ No duplicate formula + counterparty combinations found")

# Check v_user_portfolio_totals view
print(f"\n📊 VIEW ANALYSIS: v_user_portfolio_totals")
print("-" * 50)

portfolio_view = client.table("v_user_portfolio_totals").select("*").execute()
portfolio_records = portfolio_view.data

print(f"Total users in portfolio view: {len(portfolio_records)}")

# Check for users with actual data
users_with_data = [r for r in portfolio_records if any([
    r['total_finance_emissions'] > 0,
    r['total_facilitated_emissions'] > 0,
    r['total_exposure_pkr'] > 0,
    r['total_counterparties'] > 0,
    r['total_exposures'] > 0
])]

print(f"Users with actual data: {len(users_with_data)}")

if users_with_data:
    print("Users with data:")
    for record in users_with_data:
        print(f"   User: {record['user_id']}")
        print(f"      Finance Emissions: {record['total_finance_emissions']}")
        print(f"      Facilitated Emissions: {record['total_facilitated_emissions']}")
        print(f"      Exposure (PKR): {record['total_exposure_pkr']}")
        print(f"      Counterparties: {record['total_counterparties']}")
        print(f"      Exposures: {record['total_exposures']}")

print(f"\n" + "=" * 70)
print("ANALYSIS COMPLETE")
