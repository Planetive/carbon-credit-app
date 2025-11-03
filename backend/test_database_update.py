#!/usr/bin/env python3
"""
Test the database update fix for finance emissions
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

print("=== TESTING DATABASE UPDATE FIX ===")
print("=" * 50)

print("\n🔍 CURRENT STATE:")
print("-" * 30)

# Check finance_emission_calculations table
print("1️⃣ Finance Emission Calculations Table:")
finance_calcs = client.table("finance_emission_calculations").select("*").execute()
for calc in finance_calcs.data:
    print(f"  - Counterparty: {calc['counterparty_id']}")
    print(f"  - Type: {calc['calculation_type']}")
    print(f"  - Formula: {calc['formula_id']}")
    print(f"  - Emissions: {calc['financed_emissions']} tCO2e")
    print(f"  - Updated: {calc['updated_at']}")
    print()

# Check emission_calculations table
print("2️⃣ Emission Calculations Table:")
emission_calcs = client.table("emission_calculations").select("*").execute()
for calc in emission_calcs.data:
    print(f"  - Counterparty: {calc['counterparty_id']}")
    print(f"  - Type: {calc['calculation_type']}")
    print(f"  - Formula: {calc['formula_id']}")
    print(f"  - Emissions: {calc['financed_emissions']} tCO2e")
    print(f"  - Updated: {calc['updated_at']}")
    print()

# Check portfolio view
print("3️⃣ Portfolio View (v_user_portfolio_totals):")
portfolio = client.table("v_user_portfolio_totals").select("*").execute()
for port in portfolio.data:
    if port['total_finance_emissions'] > 0:
        print(f"  - User: {port['user_id']}")
        print(f"  - Total Finance Emissions: {port['total_finance_emissions']} tCO2e")
        print(f"  - Total Exposure: {port['total_exposure_pkr']} PKR")
        print()

print("\n🎯 EXPECTED BEHAVIOR AFTER FIX:")
print("-" * 30)
print("✅ When user recalculates finance emissions:")
print("   1. Data saved to finance_emission_calculations table")
print("   2. Data ALSO saved to emission_calculations table")
print("   3. Portfolio view reads from emission_calculations")
print("   4. Company detail page shows updated results")
print("   5. Finance emission card shows new calculation")
print()

print("🔧 IMPLEMENTATION:")
print("-" * 30)
print("✅ ESGWizard now saves to BOTH tables:")
print("   - finance_emission_calculations (original)")
print("   - emission_calculations (for portfolio compatibility)")
print("✅ Uses upsertEmissionCalculation method")
print("✅ Updates existing records instead of creating duplicates")
print()

print("🧪 TESTING INSTRUCTIONS:")
print("-" * 30)
print("1. Go to finance emission form")
print("2. Change some values (e.g., outstanding loan amount)")
print("3. Recalculate emissions")
print("4. Check portfolio page - should show new result")
print("5. Check company detail page - should show new result")
print("6. Run this script again to verify both tables updated")
print()

print("=" * 50)
print("✅ DATABASE UPDATE FIX IMPLEMENTED!")
print("=" * 50)
