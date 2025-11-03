#!/usr/bin/env python3
"""
Finance Emission Questionnaire Data Flow Analysis
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

print("=== FINANCE EMISSION QUESTIONNAIRE DATA FLOW ===")
print("=" * 70)

# Step 1: Check counterparties table (where counterparty info is stored)
print("\n1️⃣ COUNTERPARTIES TABLE (Initial counterparty data)")
print("-" * 50)
counterparties = client.table("counterparties").select("*").execute()
for cp in counterparties.data:
    print(f"Counterparty ID: {cp['id']}")
    print(f"Name: {cp['name']}")
    print(f"Sector: {cp['sector']}")
    print(f"Geography: {cp['geography']}")
    print(f"Type: {cp['counterparty_type']}")
    print(f"User ID: {cp['user_id']}")
    print()

# Step 2: Check counterparty_questionnaires (where questionnaire responses are stored)
print("\n2️⃣ COUNTERPARTY QUESTIONNAIRES TABLE (Questionnaire responses)")
print("-" * 50)
questionnaires = client.table("counterparty_questionnaires").select("*").execute()
for q in questionnaires.data:
    print(f"Questionnaire ID: {q['id']}")
    print(f"Counterparty ID: {q['counterparty_id']}")
    print(f"Corporate Structure: {q['corporate_structure']}")
    print(f"Has Emissions: {q['has_emissions']}")
    print(f"Scope 1 Emissions: {q['scope1_emissions']}")
    print(f"Scope 2 Emissions: {q['scope2_emissions']}")
    print(f"Scope 3 Emissions: {q['scope3_emissions']}")
    print(f"Verification Status: {q['verification_status']}")
    print(f"Verifier Name: {q['verifier_name']}")
    print(f"EVIC: {q['evic']}")
    print(f"Total Equity + Debt: {q['total_equity_plus_debt']}")
    print()

# Step 3: Check exposures table (where financial exposure data is stored)
print("\n3️⃣ EXPOSURES TABLE (Financial exposure data)")
print("-" * 50)
exposures = client.table("exposures").select("*").execute()
for exp in exposures.data:
    print(f"Exposure ID: {exp['exposure_id']}")
    print(f"Counterparty ID: {exp['counterparty_id']}")
    print(f"Amount (PKR): {exp['amount_pkr']}")
    print(f"Probability of Default: {exp['probability_of_default']}")
    print(f"Loss Given Default: {exp['loss_given_default']}")
    print(f"Tenor (months): {exp['tenor_months']}")
    print()

# Step 4: Check emission_calculations (where calculation results are stored)
print("\n4️⃣ EMISSION CALCULATIONS TABLE (Calculation results)")
print("-" * 50)
emissions = client.table("emission_calculations").select("*").execute()
for calc in emissions.data:
    print(f"Calculation ID: {calc['id']}")
    print(f"Counterparty ID: {calc['counterparty_id']}")
    print(f"Exposure ID: {calc['exposure_id']}")
    print(f"Questionnaire ID: {calc['questionnaire_id']}")
    print(f"Calculation Type: {calc['calculation_type']}")
    print(f"Company Type: {calc['company_type']}")
    print(f"Formula ID: {calc['formula_id']}")
    print(f"Financed Emissions: {calc['financed_emissions']}")
    print(f"Attribution Factor: {calc['attribution_factor']}")
    print(f"EVIC: {calc['evic']}")
    print(f"Status: {calc['status']}")
    print()
    
    # Show inputs and results JSON
    print(f"   Inputs (JSON):")
    inputs = calc['inputs']
    if isinstance(inputs, dict):
        for key, value in inputs.items():
            print(f"     {key}: {value}")
    
    print(f"   Results (JSON):")
    results = calc['results']
    if isinstance(results, dict):
        for key, value in results.items():
            print(f"     {key}: {value}")
    print()

# Step 5: Check portfolio view (aggregated results)
print("\n5️⃣ PORTFOLIO VIEW (Aggregated results)")
print("-" * 50)
portfolio = client.table("v_user_portfolio_totals").select("*").execute()
for port in portfolio.data:
    if port['total_finance_emissions'] > 0 or port['total_exposure_pkr'] > 0:
        print(f"User ID: {port['user_id']}")
        print(f"Total Finance Emissions: {port['total_finance_emissions']}")
        print(f"Total Facilitated Emissions: {port['total_facilitated_emissions']}")
        print(f"Total Exposure (PKR): {port['total_exposure_pkr']}")
        print(f"Total Counterparties: {port['total_counterparties']}")
        print(f"Total Exposures: {port['total_exposures']}")
        print()

print("\n" + "=" * 70)
print("DATA FLOW SUMMARY:")
print("=" * 70)
print("1. COUNTERPARTIES → Initial counterparty information")
print("2. COUNTERPARTY_QUESTIONNAIRES → Questionnaire responses (Scope 1,2,3 emissions)")
print("3. EXPOSURES → Financial exposure data (amounts, risk metrics)")
print("4. EMISSION_CALCULATIONS → Calculation results (financed emissions)")
print("5. V_USER_PORTFOLIO_TOTALS → Aggregated portfolio view")
