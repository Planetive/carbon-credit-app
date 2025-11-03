"""
Vercel serverless function entry point for FastAPI backend
"""
import sys
import os
from mangum import Mangum

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi_app.main import app

# Create ASGI handler for Vercel
handler = Mangum(app, lifespan="off")