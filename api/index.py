"""
Vercel serverless function entry point for FastAPI backend
"""
import sys
import os
import traceback

try:
    from mangum import Mangum
    
    # Add the backend directory to Python path
    backend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend')
    sys.path.insert(0, backend_path)
    
    from fastapi_app.main import app
    
    # Create ASGI handler for Vercel with CORS support
    # Mangum automatically handles CORS through FastAPI's middleware
    handler = Mangum(app, lifespan="off", api_gateway_base_path="")
    
except Exception as e:
    # If import fails, create a minimal error handler
    def error_handler(event, context):
        error_msg = f"Failed to initialize FastAPI app: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": f'{{"error": "Server initialization failed", "message": "{str(e)}"}}'
        }
    handler = error_handler