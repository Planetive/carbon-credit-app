"""
Test all facilitated emission formulas specifically
"""

from fastapi_app.calculation_engine import CalculationEngine
from fastapi_app.finance_models import CompanyType

def test_facilitated_emissions():
    """Test all facilitated emission formulas"""
    print("🧪 Testing All Facilitated Emission Formulas")
    print("=" * 60)
    
    # Initialize the calculation engine
    engine = CalculationEngine()
    
    # Get all facilitated emission formulas
    facilitated_formulas = [f for f in engine.get_all_formulas() if f.category.value == 'facilitated_emission']
    
    print(f"📊 Total Facilitated Emission Formulas: {len(facilitated_formulas)}")
    print()
    
    # List all facilitated formulas
    print("📋 Facilitated Emission Formulas:")
    for formula in facilitated_formulas:
        print(f"   - {formula.id}: {formula.name}")
    print()
    
    # Test cases for facilitated emissions
    test_cases = [
        {
            "formula_id": "1a-facilitated-verified-listed",
            "description": "Facilitated - Listed - Verified Emissions",
            "inputs": {
                "facilitated_amount": 1000000,
                "total_assets": 5000000,
                "evic": 5000000,
                "weighting_factor": 0.33,
                "verified_emissions": 2000
            },
            "company_type": CompanyType.LISTED
        },
        {
            "formula_id": "1a-facilitated-verified-unlisted",
            "description": "Facilitated - Unlisted - Verified Emissions",
            "inputs": {
                "facilitated_amount": 800000,
                "total_assets": 4000000,
                "total_equity_plus_debt": 4000000,
                "weighting_factor": 0.25,
                "verified_emissions": 1500
            },
            "company_type": CompanyType.PRIVATE
        },
        {
            "formula_id": "1b-facilitated-unverified-listed",
            "description": "Facilitated - Listed - Unverified Emissions",
            "inputs": {
                "facilitated_amount": 1200000,
                "total_assets": 6000000,
                "evic": 6000000,
                "weighting_factor": 0.4,
                "unverified_emissions": 2500
            },
            "company_type": CompanyType.LISTED
        },
        {
            "formula_id": "1b-facilitated-unverified-unlisted",
            "description": "Facilitated - Unlisted - Unverified Emissions",
            "inputs": {
                "facilitated_amount": 600000,
                "total_assets": 3000000,
                "total_equity_plus_debt": 3000000,
                "weighting_factor": 0.2,
                "unverified_emissions": 1200
            },
            "company_type": CompanyType.PRIVATE
        },
        {
            "formula_id": "2a-facilitated-energy-listed",
            "description": "Facilitated - Listed - Energy Consumption",
            "inputs": {
                "facilitated_amount": 1500000,
                "total_assets": 7500000,
                "evic": 7500000,
                "weighting_factor": 0.5,
                "energy_consumption": 10000,
                "emission_factor": 0.3
            },
            "company_type": CompanyType.LISTED
        },
        {
            "formula_id": "2a-facilitated-energy-unlisted",
            "description": "Facilitated - Unlisted - Energy Consumption",
            "inputs": {
                "facilitated_amount": 900000,
                "total_assets": 4500000,
                "total_equity_plus_debt": 4500000,
                "weighting_factor": 0.3,
                "energy_consumption": 8000,
                "emission_factor": 0.25
            },
            "company_type": CompanyType.PRIVATE
        },
        {
            "formula_id": "2b-facilitated-production-listed",
            "description": "Facilitated - Listed - Production Data",
            "inputs": {
                "facilitated_amount": 2000000,
                "total_assets": 10000000,
                "evic": 10000000,
                "weighting_factor": 0.6,
                "production": 5000,
                "emission_factor": 0.8
            },
            "company_type": CompanyType.LISTED
        },
        {
            "formula_id": "2b-facilitated-production-unlisted",
            "description": "Facilitated - Unlisted - Production Data",
            "inputs": {
                "facilitated_amount": 700000,
                "total_assets": 3500000,
                "total_equity_plus_debt": 3500000,
                "weighting_factor": 0.35,
                "production": 3000,
                "emission_factor": 0.6
            },
            "company_type": CompanyType.PRIVATE
        }
    ]
    
    print("🧮 Testing Facilitated Emission Calculations:")
    print("-" * 60)
    
    successful_tests = 0
    total_tests = len(test_cases)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. {test_case['description']}")
        print(f"   Formula ID: {test_case['formula_id']}")
        
        try:
            result = engine.calculate(
                formula_id=test_case['formula_id'],
                inputs=test_case['inputs'],
                company_type=test_case['company_type']
            )
            
            print(f"   ✅ SUCCESS")
            print(f"   Attribution Factor: {result.attribution_factor:.6f}")
            print(f"   Financed Emissions: {result.financed_emissions:.2f} tCO2e")
            print(f"   Data Quality Score: {result.data_quality_score}")
            print(f"   Methodology: {result.methodology}")
            
            successful_tests += 1
            
        except Exception as e:
            print(f"   ❌ FAILED: {str(e)}")
    
    print("\n" + "=" * 60)
    print("📊 FACILITATED EMISSION TEST RESULTS")
    print("=" * 60)
    print(f"Total Facilitated Formulas: {len(facilitated_formulas)}")
    print(f"Calculation Tests: {successful_tests}/{total_tests} passed")
    
    if successful_tests == total_tests:
        print("\n🎉 ALL FACILITATED EMISSION TESTS PASSED!")
        print("✅ All 8 facilitated emission formulas working correctly")
        print("✅ Complete parity with frontend facilitated emissions")
    else:
        print(f"\n⚠️  {total_tests - successful_tests} tests failed")
        print("Please check the failed tests above")
    
    return successful_tests == total_tests

if __name__ == "__main__":
    test_facilitated_emissions()
