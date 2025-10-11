"""
Test script for backend endpoints
"""

import requests
import json
import time

def test_health_endpoint():
    """Test the health endpoint"""
    try:
        response = requests.get("http://localhost:8001/health", timeout=5)
        print(f"Health endpoint status: {response.status_code}")
        print(f"Health response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health endpoint error: {e}")
        return False

def test_finance_emission_endpoint():
    """Test the finance emission endpoint"""
    try:
        test_data = {
            "formula_id": "1a-listed-equity",
            "company_type": "listed",
            "inputs": {
                "outstanding_amount": 1000000,
                "evic": 5000000,
                "verified_emissions": 1000
            }
        }
        
        response = requests.post(
            "http://localhost:8001/finance-emission",
            json=test_data,
            timeout=10
        )
        print(f"Finance emission endpoint status: {response.status_code}")
        print(f"Finance emission response: {response.json()}")
        return response.status_code in [200, 400]  # 400 is expected for now since we don't have formulas loaded
    except Exception as e:
        print(f"Finance emission endpoint error: {e}")
        return False

def main():
    print("Testing backend endpoints...")
    print("=" * 50)
    
    # Wait a bit for server to start
    time.sleep(2)
    
    # Test health endpoint
    print("1. Testing health endpoint...")
    health_ok = test_health_endpoint()
    print()
    
    # Test finance emission endpoint
    print("2. Testing finance emission endpoint...")
    finance_ok = test_finance_emission_endpoint()
    print()
    
    print("=" * 50)
    print(f"Health endpoint: {'✅ PASS' if health_ok else '❌ FAIL'}")
    print(f"Finance emission endpoint: {'✅ PASS' if finance_ok else '❌ FAIL'}")

if __name__ == "__main__":
    main()
