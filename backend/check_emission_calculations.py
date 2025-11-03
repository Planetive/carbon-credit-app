#!/usr/bin/env python3
"""
Check emission calculations for specific company
"""

import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
client = create_client(
    "https://yhticndmpvzczquivpfb.supabase.co",
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

print("=== CHECKING EMISSION CALCULATIONS FOR COMPANY ===")
print()

# Check all emission calculations for the specific company
counterparty_id = "71fda15d-63b1-4867-b429-928c5440c84d"  # Farhan's company
print(f"Company ID: {counterparty_id}")
print()

emission_calcs = client.table("emission_calculations").select("*").eq("counterparty_id", counterparty_id).order("created_at", desc=True).execute()

print(f"Total calculations found: {len(emission_calcs.data)}")
print()

for i, calc in enumerate(emission_calcs.data):
    print(f"{i+1}. Calculation:")
    print(f"   - Type: {calc['calculation_type']}")
    print(f"   - Formula: {calc['formula_id']}")
    print(f"   - Emissions: {calc['financed_emissions']} tCO2e")
    print(f"   - Created: {calc['created_at']}")
    print(f"   - Updated: {calc['updated_at']}")
    print()

print("🔍 ANALYSIS:")
print("The getFinanceEmissionResult() function finds the FIRST calculation with calculation_type === 'finance'")
print("If there are multiple finance calculations, it will always return the first one found")
print("This could be why the card shows the old value (0.91) instead of the new value (2.94)")
print()

print("💡 SOLUTION:")
print("We need to modify getFinanceEmissionResult() to return the LATEST calculation instead of the first one")
print("This can be done by sorting by created_at or updated_at in descending order")
