#!/usr/bin/env python3
"""
Simple test to verify Supabase connection
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("🔧 Simple Supabase Connection Test...")
print("=" * 50)

# Check environment variables
service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
print(f"✅ Service Role Key loaded: {service_key[:20]}..." if service_key else "❌ Service Role Key not found")

# Try to import and create client
try:
    from supabase import create_client
    print("✅ Supabase client imported successfully")
    
    # Create client
    client = create_client(
        "https://yhticndmpvzczquivpfb.supabase.co",
        service_key
    )
    print("✅ Supabase client created successfully")
    
    # Try a simple query
    result = client.table("profiles").select("id").limit(1).execute()
    print("✅ Database query executed successfully")
    print(f"   Result type: {type(result)}")
    print(f"   Result: {result}")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print(f"   Error type: {type(e)}")
