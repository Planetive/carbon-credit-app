#!/usr/bin/env python3
"""
Test script to verify Vercel API entry point works correctly
"""
import sys
import os

try:
    from api.index import handler
    print('✅ Vercel API handler imported successfully')
    
    # Test that handler is callable
    if callable(handler):
        print('✅ Handler is callable')
    else:
        print('❌ Handler is not callable')
        sys.exit(1)
    
    print('✅ Vercel API entry point is ready!')
    print('✅ Ready for deployment!')
    
except ImportError as e:
    print(f'❌ Import error: {e}')
    sys.exit(1)
except Exception as e:
    print(f'❌ Error: {e}')
    sys.exit(1)
