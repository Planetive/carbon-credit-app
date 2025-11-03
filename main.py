"""
Railway entry point for FastAPI backend
"""
import sys
import os
from mangum import Mangum

# Add the fastapi_app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'fastapi_app'))

from fastapi_app.main import app

# Create ASGI handler for Railway
handler = Mangum(app, lifespan="off")