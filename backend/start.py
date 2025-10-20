#!/usr/bin/env python3
"""
Simple script to start the FastAPI backend server
"""
import uvicorn
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    print("🚀 Starting FastAPI Backend Server...")
    print("📍 Server will be available at: http://127.0.0.1:8000")
    print("📚 API docs will be available at: http://127.0.0.1:8000/docs")
    print("🛑 Press Ctrl+C to stop the server")
    print("-" * 50)
    
    uvicorn.run(
        "fastapi_app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        log_level="info"
    )
