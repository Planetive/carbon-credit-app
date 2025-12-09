"""
Vercel serverless function entry point for FastAPI backend
"""
import sys
import os
from mangum import Mangum

# Add the backend directory to Python path
backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
sys.path.insert(0, backend_path)

from fastapi_app.main import app

# Create ASGI handler for Vercel with CORS support
# Mangum automatically handles CORS through FastAPI's middleware
handler = Mangum(app, lifespan="off", api_gateway_base_path="")