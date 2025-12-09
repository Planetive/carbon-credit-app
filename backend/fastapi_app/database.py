"""
Database configuration for FastAPI backend
Connects to the same Supabase instance used by the frontend
"""
import os
from supabase import create_client, Client
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file (only if it exists, for local dev)
# In Vercel, environment variables are set directly, no .env file needed
try:
    load_dotenv()
except:
    pass  # .env file not required in production

# Supabase configuration - using the same instance as frontend
SUPABASE_URL = "https://yhticndmpvzczquivpfb.supabase.co"
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Create Supabase client for backend operations
# Using service role key to bypass RLS for backend operations
supabase: Optional[Client] = None

def get_supabase_client() -> Client:
    """
    Get Supabase client instance
    Creates a new client if one doesn't exist
    """
    global supabase
    if supabase is None:
        if not SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_ROLE_KEY == "YOUR_SERVICE_ROLE_KEY_HERE":
            raise ValueError(
                "SUPABASE_SERVICE_ROLE_KEY not set. Please set it in your environment variables or .env file"
            )
        
        supabase = create_client(
            SUPABASE_URL, 
            SUPABASE_SERVICE_ROLE_KEY
        )
    
    return supabase

def test_connection() -> bool:
    """
    Test database connection - returns False if connection fails, doesn't raise exception
    Returns True if connection is successful, False otherwise
    """
    try:
        client = get_supabase_client()
        # Simple query to test connection
        result = client.table("profiles").select("id").limit(1).execute()
        # Check if result is valid
        if hasattr(result, 'data') or isinstance(result, dict):
            return True
        return False
    except Exception as e:
        print(f"Database connection test failed: {e}")
        return False

# Don't initialize connection on module import - let it be lazy
# This prevents crashes if SUPABASE_SERVICE_ROLE_KEY is not set
