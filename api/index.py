"""
Vercel serverless function entry point for FastAPI backend
"""
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from fastapi_app.main import app

# Export the FastAPI app for Vercel
handler = app
