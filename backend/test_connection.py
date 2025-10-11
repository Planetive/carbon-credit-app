#!/usr/bin/env python3
"""
Test script to verify backend database connection
Run this to test the setup without starting the full server
"""

import sys
import os

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from fastapi_app.database import test_connection, get_supabase_client
    
    print("🔧 Testing Backend Database Connection...")
    print("=" * 50)
    
    # Test 1: Check if we can import the database module
    print("✅ Database module imported successfully")
    
    # Test 2: Test connection
    print("🔍 Testing database connection...")
    if test_connection():
        print("✅ Database connection successful!")
        
        # Test 3: Try to get client and query
        print("🔍 Testing database query...")
        try:
            client = get_supabase_client()
            result = client.table("profiles").select("id").limit(1).execute()
            
            # Handle different response formats
            if hasattr(result, 'data'):
                data_count = len(result.data) if result.data else 0
            elif isinstance(result, dict) and 'data' in result:
                data_count = len(result['data']) if result['data'] else 0
            else:
                data_count = 0
                
            print(f"✅ Database query successful! Found {data_count} records")
            
            # Test 4: Check if we can access other tables
            print("🔍 Testing access to other tables...")
            tables_to_test = ["esg_assessments", "carbon_projects_details", "contact_submissions"]
            accessible_tables = []
            
            for table in tables_to_test:
                try:
                    client.table(table).select("id").limit(1).execute()
                    accessible_tables.append(table)
                except Exception as e:
                    print(f"⚠️  Table '{table}' not accessible: {e}")
            
            print(f"✅ Accessible tables: {accessible_tables}")
            
        except Exception as e:
            print(f"❌ Database query failed: {e}")
            sys.exit(1)
    else:
        print("❌ Database connection failed!")
        print("💡 Make sure to:")
        print("   1. Set SUPABASE_SERVICE_ROLE_KEY in .env file")
        print("   2. Use the service_role key (not anon key)")
        print("   3. Check your Supabase project settings")
        sys.exit(1)
    
    print("=" * 50)
    print("🎉 All tests passed! Backend is ready to connect to database.")
    
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("💡 Make sure to install dependencies: pip install -r requirements.txt")
    sys.exit(1)
except Exception as e:
    print(f"❌ Unexpected error: {e}")
    sys.exit(1)
