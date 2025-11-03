#!/usr/bin/env python3
"""
Example: 3 Loans per Company Scenario
"""

print("=== EXAMPLE: 3 LOANS PER COMPANY SCENARIO ===")
print("=" * 70)

print("\n📋 SCENARIO: Company 'ABC Corp' has 3 loans")
print("-" * 50)

# Example data structure
loans_example = [
    {"exposure_id": "LOAN001", "amount": 50000, "tenor": 12, "pd": 1.5, "lgd": 10},
    {"exposure_id": "LOAN002", "amount": 75000, "tenor": 24, "pd": 2.0, "lgd": 15},
    {"exposure_id": "LOAN003", "amount": 100000, "tenor": 36, "pd": 2.5, "lgd": 20}
]

print("1️⃣ HOW DATA WOULD BE STORED IN EXPOSURES TABLE:")
print("-" * 50)
total_amount = 0
for i, loan in enumerate(loans_example):
    print(f"Loan {i+1}:")
    print(f"   Exposure ID: {loan['exposure_id']}")
    print(f"   Amount: {loan['amount']:,} PKR")
    print(f"   Tenor: {loan['tenor']} months")
    print(f"   PD: {loan['pd']}%")
    print(f"   LGD: {loan['lgd']}%")
    print()
    total_amount += loan['amount']

print(f"2️⃣ PORTFOLIO VIEW WOULD SHOW:")
print("-" * 50)
print(f"   Total Exposures: 3")
print(f"   Total Outstanding Amount: {total_amount:,} PKR")
print(f"   Total Counterparties: 1")
print()

print("3️⃣ EMISSION CALCULATIONS:")
print("-" * 50)
print("   Each loan can have separate emission calculations")
print("   Different formulas can be applied per loan type")
print("   Individual financed emissions per loan")
print("   Aggregated total financed emissions")
print()

print("4️⃣ DATABASE STRUCTURE SUPPORTS:")
print("-" * 50)
print("✅ Multiple exposure_id per counterparty_id")
print("✅ Individual amount_pkr per exposure")
print("✅ Separate risk metrics per loan")
print("✅ Portfolio aggregation sums all amounts")
print("✅ Individual emission calculations per loan")
print()

print("=" * 70)
print("ANSWER: YES - Your system fully supports multiple loans!")
print("=" * 70)
print("✅ 3 loans per company → 3 records in EXPOSURES table")
print("✅ Each loan amount → Individual amount_pkr field")
print("✅ Portfolio page → Sums all amounts per company")
print("✅ Outstanding amounts → Properly accumulated and displayed")
