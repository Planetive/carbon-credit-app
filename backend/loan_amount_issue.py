#!/usr/bin/env python3
"""
Loan Amount Display Issue Analysis
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

print("=== LOAN AMOUNT DISPLAY ISSUE ANALYSIS ===")
print("=" * 70)

# Check exposures data
print("\n1️⃣ CURRENT EXPOSURES DATA:")
print("-" * 50)
exposures = client.table("exposures").select("*").execute()
for exp in exposures.data:
    print(f"Exposure ID: {exp['exposure_id']}")
    print(f"Counterparty ID: {exp['counterparty_id']}")
    print(f"Amount (PKR): {exp['amount_pkr']}")
    print(f"User ID: {exp['user_id']}")
    print(f"Created: {exp['created_at']}")
    print()

# Check counterparties to see which one has the issue
print("\n2️⃣ COUNTERPARTIES:")
print("-" * 50)
counterparties = client.table("counterparties").select("*").execute()
for cp in counterparties.data:
    print(f"Name: {cp['name']}")
    print(f"ID: {cp['id']}")
    print(f"User ID: {cp['user_id']}")
    print()

# Check portfolio view
print("\n3️⃣ PORTFOLIO VIEW DATA:")
print("-" * 50)
portfolio = client.table("v_user_portfolio_totals").select("*").execute()
for port in portfolio.data:
    print(f"User ID: {port['user_id']}")
    print(f"Total Exposure (PKR): {port['total_exposure_pkr']}")
    print(f"Total Exposures: {port['total_exposures']}")
    print(f"Total Counterparties: {port['total_counterparties']}")
    print()

# Check emission calculations to see which user has 0.91 tCO2e
print("\n4️⃣ EMISSION CALCULATIONS:")
print("-" * 50)
emissions = client.table("emission_calculations").select("*").execute()
for calc in emissions.data:
    if calc['financed_emissions'] and calc['financed_emissions'] > 0:
        print(f"User ID: {calc['user_id']}")
        print(f"Counterparty ID: {calc['counterparty_id']}")
        print(f"Financed Emissions: {calc['financed_emissions']}")
        print(f"Formula: {calc['formula_id']}")
        print()

# Find the specific user with 0.91 tCO2e
print("\n5️⃣ IDENTIFYING THE ISSUE:")
print("-" * 50)
user_with_emissions = None
for port in portfolio.data:
    if port['total_finance_emissions'] > 0:
        user_with_emissions = port['user_id']
        print(f"User with emissions: {user_with_emissions}")
        print(f"Their total exposure: {port['total_exposure_pkr']} PKR")
        break

if user_with_emissions:
    # Check their exposures
    user_exposures = [exp for exp in exposures.data if exp['user_id'] == user_with_emissions]
    print(f"\nExposures for this user:")
    for exp in user_exposures:
        print(f"  Amount: {exp['amount_pkr']} PKR")
        print(f"  Exposure ID: {exp['exposure_id']}")
        print(f"  Counterparty: {exp['counterparty_id']}")

print("\n" + "=" * 70)
print("POTENTIAL ISSUES:")
print("=" * 70)
print("1. Exposure amount might be 0 in database")
print("2. Portfolio view might not be updating")
print("3. Frontend might not be reading correct data")
print("4. Data might be in different user's account")
