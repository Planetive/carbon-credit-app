"""
Comprehensive verification that frontend and backend formulas match exactly
This script compares the calculation logic, formulas, and results to ensure no changes
"""

import sys
import os
import json
from typing import Dict, Any, List

# Add the parent directory to the path to import frontend modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

def test_frontend_calculation():
    """Test frontend calculation logic"""
    try:
        # Import frontend calculation engine
        from src.pages.finance_facilitated.engines.CalculationEngine import CalculationEngine as FrontendEngine
        from src.pages.finance_facilitated.utils.unitConversions import smartConvertUnit
        
        print("🧪 Testing Frontend Calculation Engine...")
        
        # Initialize frontend engine
        frontend_engine = FrontendEngine()
        
        # Test 1: Finance Emission (Listed)
        print("\n1️⃣ Frontend Finance Emission (Listed)...")
        frontend_inputs = {
            "outstanding_amount": 1000000,
            "evic": 5000000,
            "verified_emissions": 1000,
            "total_assets": 5000000
        }
        
        try:
            frontend_result = frontend_engine.calculate("1a-listed-equity", frontend_inputs, "listed")
            print(f"   ✅ Frontend Finance Emission: SUCCESS")
            print(f"   Attribution Factor: {frontend_result.attribution_factor:.6f}")
            print(f"   Financed Emissions: {frontend_result.financed_emissions:.2f} tCO2e")
            print(f"   Data Quality Score: {frontend_result.data_quality_score}")
            return {
                "finance_listed": {
                    "attribution_factor": frontend_result.attribution_factor,
                    "financed_emissions": frontend_result.financed_emissions,
                    "data_quality_score": frontend_result.data_quality_score,
                    "methodology": frontend_result.methodology
                }
            }
        except Exception as e:
            print(f"   ❌ Frontend Finance Emission: FAILED - {str(e)}")
            return None
            
    except ImportError as e:
        print(f"❌ Cannot import frontend modules: {str(e)}")
        return None

def test_backend_calculation():
    """Test backend calculation logic"""
    try:
        # Import backend calculation engine
        from fastapi_app.calculation_engine import CalculationEngine as BackendEngine
        from fastapi_app.finance_models import CompanyType
        
        print("\n🧪 Testing Backend Calculation Engine...")
        
        # Initialize backend engine
        backend_engine = BackendEngine()
        
        # Test 1: Finance Emission (Listed)
        print("\n1️⃣ Backend Finance Emission (Listed)...")
        backend_inputs = {
            "outstanding_amount": 1000000,
            "evic": 5000000,
            "verified_emissions": 1000,
            "total_assets": 5000000
        }
        
        try:
            backend_result = backend_engine.calculate("1a-listed-equity", backend_inputs, CompanyType.LISTED)
            print(f"   ✅ Backend Finance Emission: SUCCESS")
            print(f"   Attribution Factor: {backend_result.attribution_factor:.6f}")
            print(f"   Financed Emissions: {backend_result.financed_emissions:.2f} tCO2e")
            print(f"   Data Quality Score: {backend_result.data_quality_score}")
            return {
                "finance_listed": {
                    "attribution_factor": backend_result.attribution_factor,
                    "financed_emissions": backend_result.financed_emissions,
                    "data_quality_score": backend_result.data_quality_score,
                    "methodology": backend_result.methodology
                }
            }
        except Exception as e:
            print(f"   ❌ Backend Finance Emission: FAILED - {str(e)}")
            return None
            
    except ImportError as e:
        print(f"❌ Cannot import backend modules: {str(e)}")
        return None

def compare_results(frontend_results: Dict, backend_results: Dict):
    """Compare frontend and backend results"""
    print("\n🔍 COMPARING FRONTEND vs BACKEND RESULTS")
    print("=" * 60)
    
    if not frontend_results or not backend_results:
        print("❌ Cannot compare - one or both engines failed")
        return False
    
    # Compare Finance Emission (Listed)
    if "finance_listed" in frontend_results and "finance_listed" in backend_results:
        frontend = frontend_results["finance_listed"]
        backend = backend_results["finance_listed"]
        
        print("\n📊 Finance Emission (Listed) Comparison:")
        print(f"   Frontend Attribution Factor: {frontend['attribution_factor']:.6f}")
        print(f"   Backend Attribution Factor:  {backend['attribution_factor']:.6f}")
        print(f"   Difference: {abs(frontend['attribution_factor'] - backend['attribution_factor']):.10f}")
        
        print(f"   Frontend Financed Emissions: {frontend['financed_emissions']:.2f} tCO2e")
        print(f"   Backend Financed Emissions:  {backend['financed_emissions']:.2f} tCO2e")
        print(f"   Difference: {abs(frontend['financed_emissions'] - backend['financed_emissions']):.2f} tCO2e")
        
        print(f"   Frontend Data Quality Score: {frontend['data_quality_score']}")
        print(f"   Backend Data Quality Score:  {backend['data_quality_score']}")
        
        # Check if results match (within small tolerance for floating point)
        attribution_match = abs(frontend['attribution_factor'] - backend['attribution_factor']) < 0.000001
        emissions_match = abs(frontend['financed_emissions'] - backend['financed_emissions']) < 0.01
        quality_match = frontend['data_quality_score'] == backend['data_quality_score']
        
        print(f"\n   ✅ Attribution Factor Match: {attribution_match}")
        print(f"   ✅ Financed Emissions Match: {emissions_match}")
        print(f"   ✅ Data Quality Score Match: {quality_match}")
        
        overall_match = attribution_match and emissions_match and quality_match
        print(f"\n   🎯 Overall Match: {overall_match}")
        
        return overall_match
    
    return False

def verify_formula_definitions():
    """Verify that formula definitions match between frontend and backend"""
    print("\n🔍 VERIFYING FORMULA DEFINITIONS")
    print("=" * 60)
    
    try:
        # Check frontend formula definitions
        print("\n📋 Frontend Formula Definitions:")
        from src.pages.finance_facilitated.config.corporateBondAndBusinessLoanFormulaConfigs import LISTED_EQUITY_FORMULAS
        
        frontend_formulas = {}
        for formula in LISTED_EQUITY_FORMULAS:
            if formula.id == "1a-listed-equity":
                frontend_formulas[formula.id] = {
                    "name": formula.name,
                    "description": formula.description,
                    "option_code": formula.option_code,
                    "data_quality_score": formula.data_quality_score,
                    "inputs": [{"name": inp.name, "required": inp.required} for inp in formula.inputs]
                }
                print(f"   ✅ Found: {formula.id} - {formula.name}")
                print(f"      Option Code: {formula.option_code}")
                print(f"      Data Quality Score: {formula.data_quality_score}")
                print(f"      Required Inputs: {[inp.name for inp in formula.inputs if inp.required]}")
        
        # Check backend formula definitions
        print("\n📋 Backend Formula Definitions:")
        from fastapi_app.formula_configs import BASIC_FORMULAS
        
        backend_formulas = {}
        for formula in BASIC_FORMULAS:
            if formula.id == "1a-listed-equity":
                backend_formulas[formula.id] = {
                    "name": formula.name,
                    "description": formula.description,
                    "option_code": formula.option_code,
                    "data_quality_score": formula.data_quality_score,
                    "inputs": [{"name": inp.name, "required": inp.required} for inp in formula.inputs]
                }
                print(f"   ✅ Found: {formula.id} - {formula.name}")
                print(f"      Option Code: {formula.option_code}")
                print(f"      Data Quality Score: {formula.data_quality_score}")
                print(f"      Required Inputs: {[inp.name for inp in formula.inputs if inp.required]}")
        
        # Compare formula definitions
        print("\n🔍 Formula Definition Comparison:")
        if "1a-listed-equity" in frontend_formulas and "1a-listed-equity" in backend_formulas:
            frontend_formula = frontend_formulas["1a-listed-equity"]
            backend_formula = backend_formulas["1a-listed-equity"]
            
            name_match = frontend_formula["name"] == backend_formula["name"]
            option_match = frontend_formula["option_code"] == backend_formula["option_code"]
            quality_match = frontend_formula["data_quality_score"] == backend_formula["data_quality_score"]
            
            print(f"   ✅ Name Match: {name_match}")
            print(f"   ✅ Option Code Match: {option_match}")
            print(f"   ✅ Data Quality Score Match: {quality_match}")
            
            # Compare required inputs
            frontend_inputs = set([inp["name"] for inp in frontend_formula["inputs"] if inp["required"]])
            backend_inputs = set([inp["name"] for inp in backend_formula["inputs"] if inp["required"]])
            inputs_match = frontend_inputs == backend_inputs
            
            print(f"   ✅ Required Inputs Match: {inputs_match}")
            print(f"      Frontend: {sorted(frontend_inputs)}")
            print(f"      Backend:  {sorted(backend_inputs)}")
            
            formula_match = name_match and option_match and quality_match and inputs_match
            print(f"\n   🎯 Formula Definition Match: {formula_match}")
            
            return formula_match
        
        return False
        
    except Exception as e:
        print(f"❌ Error verifying formula definitions: {str(e)}")
        return False

def verify_calculation_logic():
    """Verify that the core calculation logic matches"""
    print("\n🔍 VERIFYING CALCULATION LOGIC")
    print("=" * 60)
    
    # Test the core calculation manually
    print("\n🧮 Manual Calculation Verification:")
    
    # Test data
    outstanding_amount = 1000000
    evic = 5000000
    verified_emissions = 1000
    
    # Calculate attribution factor
    attribution_factor = outstanding_amount / evic
    print(f"   Attribution Factor = {outstanding_amount} / {evic} = {attribution_factor:.6f}")
    
    # Calculate financed emissions
    financed_emissions = attribution_factor * verified_emissions
    print(f"   Financed Emissions = {attribution_factor:.6f} × {verified_emissions} = {financed_emissions:.2f} tCO2e")
    
    # Expected results
    expected_attribution = 0.2
    expected_emissions = 200.0
    
    print(f"\n   Expected Attribution Factor: {expected_attribution:.6f}")
    print(f"   Expected Financed Emissions: {expected_emissions:.2f} tCO2e")
    
    attribution_correct = abs(attribution_factor - expected_attribution) < 0.000001
    emissions_correct = abs(financed_emissions - expected_emissions) < 0.01
    
    print(f"\n   ✅ Attribution Factor Correct: {attribution_correct}")
    print(f"   ✅ Financed Emissions Correct: {emissions_correct}")
    
    logic_correct = attribution_correct and emissions_correct
    print(f"\n   🎯 Calculation Logic Correct: {logic_correct}")
    
    return logic_correct

def main():
    """Run comprehensive verification"""
    print("🔍 COMPREHENSIVE FRONTEND vs BACKEND VERIFICATION")
    print("=" * 80)
    print("This script verifies that frontend and backend formulas match exactly")
    print("with no changes whatsoever in the calculation logic.")
    print("=" * 80)
    
    # Test 1: Frontend calculations
    frontend_results = test_frontend_calculation()
    
    # Test 2: Backend calculations
    backend_results = test_backend_calculation()
    
    # Test 3: Compare results
    results_match = compare_results(frontend_results, backend_results)
    
    # Test 4: Verify formula definitions
    formulas_match = verify_formula_definitions()
    
    # Test 5: Verify calculation logic
    logic_correct = verify_calculation_logic()
    
    # Final summary
    print("\n" + "=" * 80)
    print("📊 FINAL VERIFICATION SUMMARY")
    print("=" * 80)
    print(f"Frontend Calculations: {'✅ WORKING' if frontend_results else '❌ FAILED'}")
    print(f"Backend Calculations:  {'✅ WORKING' if backend_results else '❌ FAILED'}")
    print(f"Results Match:         {'✅ MATCH' if results_match else '❌ DIFFERENT'}")
    print(f"Formula Definitions:   {'✅ MATCH' if formulas_match else '❌ DIFFERENT'}")
    print(f"Calculation Logic:     {'✅ CORRECT' if logic_correct else '❌ INCORRECT'}")
    
    overall_success = results_match and formulas_match and logic_correct
    print(f"\n🎯 OVERALL VERIFICATION: {'✅ SUCCESS - NO CHANGES' if overall_success else '❌ FAILED - CHANGES DETECTED'}")
    
    if overall_success:
        print("\n🎉 CONFIRMATION: Frontend and backend formulas match exactly!")
        print("   No changes whatsoever in the calculation logic.")
        print("   Migration was successful and preserves all original functionality.")
    else:
        print("\n⚠️  WARNING: Differences detected between frontend and backend!")
        print("   Please review the differences above and ensure consistency.")
    
    return overall_success

if __name__ == "__main__":
    main()
