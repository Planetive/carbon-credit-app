#!/usr/bin/env python3
"""
Test the exposure amount fix
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

print("=== TESTING EXPOSURE AMOUNT FIX ===")
print("=" * 50)

# Check current state
print("\n1️⃣ CURRENT STATE:")
print("-" * 30)
exposures = client.table("exposures").select("*").execute()
for exp in exposures.data:
    print(f"Exposure ID: {exp['exposure_id']}")
    print(f"Counterparty ID: {exp['counterparty_id']}")
    print(f"Amount (PKR): {exp['amount_pkr']}")
    print(f"User ID: {exp['user_id']}")
    print()

# Check portfolio view
print("\n2️⃣ PORTFOLIO VIEW:")
print("-" * 30)
portfolio = client.table("v_user_portfolio_totals").select("*").execute()
for port in portfolio.data:
    if port['total_exposure_pkr'] > 0 or port['total_finance_emissions'] > 0:
        print(f"User ID: {port['user_id']}")
        print(f"Total Exposure (PKR): {port['total_exposure_pkr']}")
        print(f"Total Finance Emissions: {port['total_finance_emissions']}")
        print()

print("\n3️⃣ EXPECTED BEHAVIOR AFTER FIX:")
print("-" * 30)
print("✅ When user enters outstanding loan amount in finance form:")
print("   - Amount should be saved to exposures.amount_pkr")
print("   - Portfolio view should show correct loan amount")
print("   - Finance emissions should still calculate correctly")
print()

print("4️⃣ TESTING INSTRUCTIONS:")
print("-" * 30)
print("1. Go to finance emission form")
print("2. Enter an outstanding loan amount (e.g., 50000)")
print("3. Fill out the form and submit")
print("4. Check portfolio page - loan amount should now show correctly")
print("5. Run this script again to verify the fix worked")
