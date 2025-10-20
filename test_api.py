#!/usr/bin/env python3
"""
Test script to verify API entry point works correctly
"""
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from mangum import Mangum
    print('✅ Mangum imported successfully')
    
    from fastapi_app.main import app
    print('✅ FastAPI app imported successfully')
    
    handler = Mangum(app, lifespan="off")
    print('✅ Mangum handler created successfully')
    
    print('✅ API entry point is working!')
    print('✅ Ready for Vercel deployment!')
    
except ImportError as e:
    print(f'❌ Import error: {e}')
    sys.exit(1)
except Exception as e:
    print(f'❌ Error: {e}')
    sys.exit(1)
