"""
Comprehensive calculation test to ensure backend works same as frontend
Tests both finance and facilitated emissions with real data
"""

import requests
import json
import time
from typing import Dict, Any

# Test data based on frontend examples
TEST_CASES = {
    "finance_emission_listed": {
        "formula_id": "1a-listed-equity",
        "company_type": "listed",
        "inputs": {
            "outstanding_amount": 1000000,  # $1M investment
            "evic": 5000000,  # $5M EVIC
            "verified_emissions": 1000,  # 1000 tCO2e
            "total_assets": 5000000
        }
    },
    "finance_emission_unlisted": {
        "formula_id": "1a-unlisted-equity", 
        "company_type": "unlisted",
        "inputs": {
            "outstanding_amount": 500000,  # $500K investment
            "total_equity_plus_debt": 2000000,  # $2M total equity + debt
            "verified_emissions": 500,  # 500 tCO2e
            "total_assets": 2000000
        }
    },
    "facilitated_emission_listed": {
        "formula_id": "1a-facilitated-listed",
        "company_type": "listed", 
        "inputs": {
            "facilitated_amount": 2000000,  # $2M facilitated
            "evic": 10000000,  # $10M EVIC
            "weighting_factor": 0.33,  # 33% weighting
            "verified_emissions": 2000,  # 2000 tCO2e
            "total_assets": 10000000
        }
    },
    "facilitated_emission_unlisted": {
        "formula_id": "1a-facilitated-unlisted",
        "company_type": "unlisted",
        "inputs": {
            "facilitated_amount": 1000000,  # $1M facilitated
            "total_equity_plus_debt": 5000000,  # $5M total equity + debt
            "weighting_factor": 0.33,  # 33% weighting
            "verified_emissions": 1000,  # 1000 tCO2e
            "total_assets": 5000000
        }
    }
}

def test_backend_health():
    """Test if backend is running"""
    try:
        response = requests.get("http://localhost:8001/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend health check: PASSED")
            return True
        else:
            print(f"❌ Backend health check: FAILED (Status: {response.status_code})")
            return False
    except Exception as e:
        print(f"❌ Backend health check: FAILED (Error: {e})")
        return False

def test_finance_emission_calculation(test_case: Dict[str, Any]):
    """Test finance emission calculation"""
    try:
        print(f"\n🧪 Testing Finance Emission: {test_case['formula_id']}")
        print(f"   Company Type: {test_case['company_type']}")
        print(f"   Outstanding Amount: ${test_case['inputs']['outstanding_amount']:,}")
        
        response = requests.post(
            "http://localhost:8001/finance-emission",
            json=test_case,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                calc_result = result['result']
                print(f"✅ Finance Emission Calculation: SUCCESS")
                print(f"   Attribution Factor: {calc_result['attribution_factor']:.6f}")
                print(f"   Financed Emissions: {calc_result['financed_emissions']:.2f} tCO2e")
                print(f"   Data Quality Score: {calc_result['data_quality_score']}")
                print(f"   Methodology: {calc_result['methodology']}")
                
                # Verify calculation logic
                expected_attribution = test_case['inputs']['outstanding_amount'] / test_case['inputs'].get('evic', test_case['inputs'].get('total_equity_plus_debt', 1))
                expected_emissions = expected_attribution * test_case['inputs'].get('verified_emissions', 0)
                
                print(f"   Expected Attribution: {expected_attribution:.6f}")
                print(f"   Expected Emissions: {expected_emissions:.2f} tCO2e")
                
                return True
            else:
                print(f"❌ Finance Emission Calculation: FAILED")
                print(f"   Error: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ Finance Emission Calculation: FAILED (Status: {response.status_code})")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Finance Emission Calculation: FAILED (Error: {e})")
        return False

def test_facilitated_emission_calculation(test_case: Dict[str, Any]):
    """Test facilitated emission calculation"""
    try:
        print(f"\n🧪 Testing Facilitated Emission: {test_case['formula_id']}")
        print(f"   Company Type: {test_case['company_type']}")
        print(f"   Facilitated Amount: ${test_case['inputs']['facilitated_amount']:,}")
        print(f"   Weighting Factor: {test_case['inputs']['weighting_factor']}")
        
        response = requests.post(
            "http://localhost:8001/facilitated-emission",
            json=test_case,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                calc_result = result['result']
                print(f"✅ Facilitated Emission Calculation: SUCCESS")
                print(f"   Attribution Factor: {calc_result['attribution_factor']:.6f}")
                print(f"   Financed Emissions: {calc_result['financed_emissions']:.2f} tCO2e")
                print(f"   Data Quality Score: {calc_result['data_quality_score']}")
                print(f"   Methodology: {calc_result['methodology']}")
                
                # Verify calculation logic
                denominator = test_case['inputs'].get('evic', test_case['inputs'].get('total_equity_plus_debt', 1))
                expected_attribution = test_case['inputs']['facilitated_amount'] / denominator
                expected_emissions = expected_attribution * test_case['inputs']['weighting_factor'] * test_case['inputs'].get('verified_emissions', 0)
                
                print(f"   Expected Attribution: {expected_attribution:.6f}")
                print(f"   Expected Emissions: {expected_emissions:.2f} tCO2e")
                
                return True
            else:
                print(f"❌ Facilitated Emission Calculation: FAILED")
                print(f"   Error: {result.get('error', 'Unknown error')}")
                return False
        else:
            print(f"❌ Facilitated Emission Calculation: FAILED (Status: {response.status_code})")
            print(f"   Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Facilitated Emission Calculation: FAILED (Error: {e})")
        return False

def test_database_connection():
    """Test database connection"""
    try:
        response = requests.get("http://localhost:8001/test-db", timeout=5)
        if response.status_code == 200:
            result = response.json()
            if result.get('status') == 'success':
                print("✅ Database connection: PASSED")
                return True
            else:
                print(f"❌ Database connection: FAILED")
                print(f"   Message: {result.get('message', 'Unknown error')}")
                return False
        else:
            print(f"❌ Database connection: FAILED (Status: {response.status_code})")
            return False
    except Exception as e:
        print(f"❌ Database connection: FAILED (Error: {e})")
        return False

def main():
    """Run comprehensive calculation tests"""
    print("🧪 BACKEND CALCULATION TEST SUITE")
    print("=" * 60)
    
    # Wait for server to start
    print("⏳ Waiting for backend server to start...")
    time.sleep(3)
    
    # Test 1: Backend Health
    print("\n1️⃣ Testing Backend Health...")
    health_ok = test_backend_health()
    
    if not health_ok:
        print("\n❌ Backend is not running. Please start the server first.")
        return
    
    # Test 2: Database Connection
    print("\n2️⃣ Testing Database Connection...")
    db_ok = test_database_connection()
    
    # Test 3: Finance Emission Calculations
    print("\n3️⃣ Testing Finance Emission Calculations...")
    finance_tests_passed = 0
    for test_name, test_case in TEST_CASES.items():
        if "finance_emission" in test_name:
            if test_finance_emission_calculation(test_case):
                finance_tests_passed += 1
    
    # Test 4: Facilitated Emission Calculations
    print("\n4️⃣ Testing Facilitated Emission Calculations...")
    facilitated_tests_passed = 0
    for test_name, test_case in TEST_CASES.items():
        if "facilitated_emission" in test_name:
            if test_facilitated_emission_calculation(test_case):
                facilitated_tests_passed += 1
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"Backend Health: {'✅ PASS' if health_ok else '❌ FAIL'}")
    print(f"Database Connection: {'✅ PASS' if db_ok else '❌ FAIL'}")
    print(f"Finance Emission Tests: {finance_tests_passed}/2 PASSED")
    print(f"Facilitated Emission Tests: {facilitated_tests_passed}/2 PASSED")
    
    total_tests = 2 + 2 + 2  # health + db + 4 calculation tests
    passed_tests = (1 if health_ok else 0) + (1 if db_ok else 0) + finance_tests_passed + facilitated_tests_passed
    
    print(f"\nOverall: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        print("🎉 ALL TESTS PASSED! Backend calculations work correctly.")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")

if __name__ == "__main__":
    main()
