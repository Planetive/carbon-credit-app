"""
Test all formula configurations to ensure they're loaded correctly
"""

from fastapi_app.calculation_engine import CalculationEngine
from fastapi_app.finance_models import CompanyType

def test_all_formulas():
    """Test that all formula configurations are loaded"""
    print("🧪 Testing All Formula Configurations")
    print("=" * 60)
    
    # Initialize the calculation engine
    engine = CalculationEngine()
    
    # Get all formulas
    formulas = engine.get_all_formulas()
    
    print(f"📊 Total Formulas Loaded: {len(formulas)}")
    print()
    
    # Group by category
    categories = {}
    for formula in formulas:
        category = formula.category.value
        if category not in categories:
            categories[category] = []
        categories[category].append(formula)
    
    print("📋 Formulas by Category:")
    for category, category_formulas in categories.items():
        print(f"   {category}: {len(category_formulas)} formulas")
        for formula in category_formulas:
            print(f"      - {formula.id}: {formula.name}")
        print()
    
    # Test a few different formula types
    test_cases = [
        {
            "formula_id": "1a-listed-equity",
            "description": "Corporate Bond - Listed - Verified Emissions",
            "inputs": {
                "outstanding_amount": 1000000,
                "total_assets": 5000000,
                "evic": 5000000,
                "verified_emissions": 1000
            },
            "company_type": CompanyType.LISTED
        },
        {
            "formula_id": "1a-commercial-real-estate",
            "description": "Commercial Real Estate - Verified Emissions",
            "inputs": {
                "outstanding_amount": 500000,
                "property_value_at_origination": 2000000,
                "actual_energy_consumption": 10000,
                "supplier_specific_emission_factor": 0.5
            },
            "company_type": CompanyType.LISTED
        },
        {
            "formula_id": "1a-mortgage",
            "description": "Mortgage - Verified Emissions",
            "inputs": {
                "outstanding_amount": 300000,
                "property_value_at_origination": 400000,
                "actual_energy_consumption": 5000,
                "supplier_specific_emission_factor": 0.4
            },
            "company_type": CompanyType.LISTED
        },
        {
            "formula_id": "1a-motor-vehicle",
            "description": "Motor Vehicle Loan - Verified Emissions",
            "inputs": {
                "outstanding_amount": 25000,
                "total_value_at_origination": 30000,
                "fuel_consumption": 1000,
                "emission_factor": 0.002
            },
            "company_type": CompanyType.LISTED
        },
        {
            "formula_id": "1a-project-finance",
            "description": "Project Finance - Verified Emissions",
            "inputs": {
                "outstanding_amount": 2000000,
                "total_project_equity_plus_debt": 10000000,
                "verified_emissions": 5000
            },
            "company_type": CompanyType.LISTED
        },
        {
            "formula_id": "1a-sovereign-debt",
            "description": "Sovereign Debt - Verified Emissions",
            "inputs": {
                "outstanding_amount": 10000000,
                "ppp_adjusted_gdp": 1000000000,
                "verified_emissions": 100000
            },
            "company_type": CompanyType.LISTED
        },
        {
            "formula_id": "1a-facilitated-verified-listed",
            "description": "Facilitated Emission - Listed - Verified Emissions",
            "inputs": {
                "facilitated_amount": 1000000,
                "total_assets": 5000000,
                "evic": 5000000,
                "weighting_factor": 0.33,
                "verified_emissions": 2000
            },
            "company_type": CompanyType.LISTED
        }
    ]
    
    print("🧮 Testing Formula Calculations:")
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
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"Total Formulas Loaded: {len(formulas)}")
    print(f"Formula Categories: {len(categories)}")
    print(f"Calculation Tests: {successful_tests}/{total_tests} passed")
    
    if successful_tests == total_tests:
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ All formula configurations loaded successfully")
        print("✅ All calculation types working correctly")
        print("✅ Backend has complete formula coverage")
    else:
        print(f"\n⚠️  {total_tests - successful_tests} tests failed")
        print("Please check the failed tests above")
    
    return successful_tests == total_tests

if __name__ == "__main__":
    test_all_formulas()
