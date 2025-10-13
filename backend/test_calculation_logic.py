"""
Test the calculation logic directly without API calls
This will verify that the core calculation engine works correctly
"""

from fastapi_app.calculation_engine import CalculationEngine
from fastapi_app.finance_models import CompanyType

def test_calculation_engine_directly():
    """Test the calculation engine directly"""
    print("🧪 Testing Calculation Engine Directly")
    print("=" * 50)
    
    # Initialize the calculation engine
    engine = CalculationEngine()
    
    # Test 1: Check if formulas are loaded
    print("\n1️⃣ Checking Formula Configurations...")
    formulas = engine.get_all_formulas()
    print(f"   Loaded {len(formulas)} formulas")
    
    for formula in formulas:
        print(f"   - {formula.id}: {formula.name}")
    
    # Test 2: Test Finance Emission Calculation
    print("\n2️⃣ Testing Finance Emission Calculation...")
    try:
        # Test data for listed company
        test_inputs = {
            "outstanding_amount": 1000000,  # $1M
            "evic": 5000000,  # $5M
            "verified_emissions": 1000,  # 1000 tCO2e
            "total_assets": 5000000
        }
        
        result = engine.calculate(
            formula_id="1a-listed-equity",
            inputs=test_inputs,
            company_type=CompanyType.LISTED
        )
        
        print(f"✅ Finance Emission Calculation: SUCCESS")
        print(f"   Attribution Factor: {result.attribution_factor:.6f}")
        print(f"   Financed Emissions: {result.financed_emissions:.2f} tCO2e")
        print(f"   Data Quality Score: {result.data_quality_score}")
        print(f"   Methodology: {result.methodology}")
        
        # Verify calculation
        expected_attribution = 1000000 / 5000000  # 0.2
        expected_emissions = expected_attribution * 1000  # 200 tCO2e
        
        print(f"   Expected Attribution: {expected_attribution:.6f}")
        print(f"   Expected Emissions: {expected_emissions:.2f} tCO2e")
        
        if abs(result.attribution_factor - expected_attribution) < 0.000001:
            print("   ✅ Attribution factor calculation is correct")
        else:
            print("   ❌ Attribution factor calculation is incorrect")
            
        if abs(result.financed_emissions - expected_emissions) < 0.01:
            print("   ✅ Financed emissions calculation is correct")
        else:
            print("   ❌ Financed emissions calculation is incorrect")
            
    except Exception as e:
        print(f"❌ Finance Emission Calculation: FAILED")
        print(f"   Error: {str(e)}")
    
    # Test 3: Test Facilitated Emission Calculation
    print("\n3️⃣ Testing Facilitated Emission Calculation...")
    try:
        # Test data for facilitated emission
        test_inputs = {
            "facilitated_amount": 2000000,  # $2M
            "evic": 10000000,  # $10M
            "weighting_factor": 0.33,  # 33%
            "verified_emissions": 2000,  # 2000 tCO2e
            "total_assets": 10000000
        }
        
        result = engine.calculate(
            formula_id="1a-facilitated-listed",
            inputs=test_inputs,
            company_type=CompanyType.LISTED
        )
        
        print(f"✅ Facilitated Emission Calculation: SUCCESS")
        print(f"   Attribution Factor: {result.attribution_factor:.6f}")
        print(f"   Financed Emissions: {result.financed_emissions:.2f} tCO2e")
        print(f"   Data Quality Score: {result.data_quality_score}")
        print(f"   Methodology: {result.methodology}")
        
        # Verify calculation
        expected_attribution = 2000000 / 10000000  # 0.2
        expected_emissions = expected_attribution * 0.33 * 2000  # 132 tCO2e
        
        print(f"   Expected Attribution: {expected_attribution:.6f}")
        print(f"   Expected Emissions: {expected_emissions:.2f} tCO2e")
        
        if abs(result.attribution_factor - expected_attribution) < 0.000001:
            print("   ✅ Attribution factor calculation is correct")
        else:
            print("   ❌ Attribution factor calculation is incorrect")
            
        if abs(result.financed_emissions - expected_emissions) < 0.01:
            print("   ✅ Facilitated emissions calculation is correct")
        else:
            print("   ❌ Facilitated emissions calculation is incorrect")
            
    except Exception as e:
        print(f"❌ Facilitated Emission Calculation: FAILED")
        print(f"   Error: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🎯 Direct Calculation Engine Test Complete")

if __name__ == "__main__":
    test_calculation_engine_directly()
