"""
Vercel serverless function entry point for FastAPI backend
"""
import sys
import os
import traceback
import json

# CORS headers that should be on ALL responses
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "https://www.rethinkcarbon.io",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "3600",
}

def add_cors_headers(response):
    """Add CORS headers to any response"""
    if isinstance(response, dict):
        if "headers" not in response:
            response["headers"] = {}
        response["headers"].update(CORS_HEADERS)
    return response

def get_handler():
    """Initialize and return the handler with detailed error reporting"""
    try:
        print("Starting handler initialization...")
        print(f"Current directory: {os.getcwd()}")
        print(f"Python path: {sys.path}")
        print(f"__file__: {__file__}")
        
        from mangum import Mangum
        print("✓ Mangum imported successfully")
        
        # Add the backend directory to Python path
        # api/index.py is in api/ folder, so we need to go up one level to get to root
        current_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.dirname(current_dir)  # Go up from api/ to root
        backend_path = os.path.join(root_dir, 'backend')
        
        print(f"Current dir: {current_dir}")
        print(f"Root dir: {root_dir}")
        print(f"Backend path: {backend_path}")
        print(f"Backend path exists: {os.path.exists(backend_path)}")
        
        if not os.path.exists(backend_path):
            raise ImportError(f"Backend directory not found at: {backend_path}")
        
        sys.path.insert(0, backend_path)
        print(f"✓ Added {backend_path} to Python path")
        
        from fastapi_app.main import app
        print("✓ FastAPI app imported successfully")
        
        # Create ASGI handler for Vercel
        mangum_handler = Mangum(app, lifespan="off", api_gateway_base_path="")
        print("✓ Mangum handler created successfully")
        
        # Wrap handler to ensure CORS headers are always added
        def wrapped_handler(event, context):
            try:
                # Handle OPTIONS preflight requests directly
                if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
                    return {
                        "statusCode": 200,
                        "headers": CORS_HEADERS,
                        "body": ""
                    }
                
                # Call the actual handler
                response = mangum_handler(event, context)
                
                # Ensure CORS headers are added
                return add_cors_headers(response)
                
            except Exception as e:
                # Even on error, return CORS headers
                error_response = {
                    "statusCode": 500,
                    "headers": CORS_HEADERS.copy(),
                    "body": json.dumps({
                        "error": "Internal server error",
                        "message": str(e)
                    })
                }
                error_response["headers"]["Content-Type"] = "application/json"
                print(f"Error in handler: {e}\n{traceback.format_exc()}")
                return error_response
        
        return wrapped_handler
        
    except Exception as e:
        error_msg = f"Failed to initialize FastAPI app: {str(e)}\n{traceback.format_exc()}"
        print("=" * 80)
        print("ERROR DURING INITIALIZATION:")
        print(error_msg)
        print("=" * 80)
        
        # Return a handler that shows the error but still has CORS headers
        def error_handler(event, context):
            # Handle OPTIONS preflight
            if event.get("requestContext", {}).get("http", {}).get("method") == "OPTIONS":
                return {
                    "statusCode": 200,
                    "headers": CORS_HEADERS,
                    "body": ""
                }
            
            return {
                "statusCode": 500,
                "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
                "body": json.dumps({
                    "error": "Server initialization failed",
                    "message": str(e),
                    "traceback": traceback.format_exc()
                })
            }
        return error_handler

# Initialize handler at module level
handler = get_handler()