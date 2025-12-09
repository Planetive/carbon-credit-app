"""
Vercel serverless function entry point for FastAPI backend
"""
import sys
import os
import traceback
import json

# CORS headers that should be on ALL responses
# Note: Access-Control-Allow-Origin should be set dynamically based on request origin
# For now, we'll use a wildcard for development, but FastAPI middleware will handle it properly
def get_cors_headers(origin=None):
    """Get CORS headers, allowing specific origins"""
    allowed_origins = [
        "https://www.rethinkcarbon.io",
        "https://rethinkcarbon.io",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8080",
    ]
    
    # If origin is provided and in allowed list, use it
    if origin and origin in allowed_origins:
        allow_origin = origin
    # Allow any localhost or 127.0.0.1 origin for dev (fix: use proper condition)
    elif origin and (origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:")):
        allow_origin = origin  # Allow any localhost origin for dev
    else:
        # Default to production, but if origin is provided and not localhost, reject it
        if origin and not (origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:")):
            allow_origin = "https://www.rethinkcarbon.io"  # Default to production
        else:
            allow_origin = origin if origin else "https://www.rethinkcarbon.io"
    
    return {
        "Access-Control-Allow-Origin": allow_origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin, X-Requested-With, Access-Control-Request-Method, Access-Control-Request-Headers",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "3600",
    }

# Default CORS headers (will be overridden by get_cors_headers in handler)
CORS_HEADERS = get_cors_headers()

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
                # Extract origin from request headers (Vercel uses lowercase keys)
                headers = event.get("headers", {}) or {}
                # Try multiple case variations
                origin = (
                    headers.get("origin") or
                    headers.get("Origin") or
                    headers.get("ORIGIN") or
                    headers.get("x-forwarded-host") or  # Vercel sometimes uses this
                    None
                )
                
                # Also check if there's a referer header that might help
                if not origin:
                    referer = headers.get("referer") or headers.get("Referer") or headers.get("REFERER")
                    if referer:
                        # Extract origin from referer
                        try:
                            from urllib.parse import urlparse
                            parsed = urlparse(referer)
                            origin = f"{parsed.scheme}://{parsed.netloc}"
                        except:
                            pass
                
                print(f"Request origin: {origin}, headers keys: {list(headers.keys())}")
                
                # Get CORS headers based on origin
                cors_headers = get_cors_headers(origin)
                
                # Handle OPTIONS preflight requests directly
                # Vercel Python runtime event format - check multiple possible locations
                method = None
                
                # Try Vercel's event format first (requestContext.http.method)
                if "requestContext" in event:
                    http_info = event.get("requestContext", {}).get("http", {})
                    if http_info:
                        method = http_info.get("method")
                
                # Fallback to other possible formats
                if not method:
                    method = event.get("httpMethod") or event.get("method") or event.get("requestMethod")
                
                # Check if it's an OPTIONS request by examining the request
                # Sometimes the method might be in a different format
                is_options = False
                if method:
                    is_options = method.upper() == "OPTIONS"
                else:
                    # If we can't find method, check if there's an access-control-request-method header
                    # which indicates a preflight request
                    acrm = headers.get("access-control-request-method") or headers.get("Access-Control-Request-Method")
                    if acrm:
                        is_options = True
                        method = "OPTIONS"
                
                print(f"Request method: {method}, is_options: {is_options}, origin: {origin}")
                
                if is_options:
                    print(f"Handling OPTIONS preflight request from origin: {origin}")
                    return {
                        "statusCode": 200,
                        "headers": cors_headers,
                        "body": ""
                    }
                
                # Call the actual handler
                response = mangum_handler(event, context)
                
                # Ensure CORS headers are added to the response
                if isinstance(response, dict):
                    if "headers" not in response:
                        response["headers"] = {}
                    # Merge CORS headers, ensuring they're not overwritten
                    response["headers"].update(cors_headers)
                
                return response
                
            except Exception as e:
                # Even on error, return CORS headers
                headers = event.get("headers", {}) or {}
                origin = headers.get("origin") or headers.get("Origin") or headers.get("ORIGIN") or None
                cors_headers = get_cors_headers(origin)
                
                print(f"Error in wrapped handler: {e}\n{traceback.format_exc()}")
                error_response = {
                    "statusCode": 500,
                    "headers": {**cors_headers, "Content-Type": "application/json"},
                    "body": json.dumps({
                        "error": "Internal server error",
                        "message": str(e)
                    })
                }
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
            # Extract origin from request headers
            headers = event.get("headers", {}) or {}
            origin = headers.get("origin") or headers.get("Origin") or headers.get("ORIGIN") or None
            cors_headers = get_cors_headers(origin)
            
            # Handle OPTIONS preflight - check multiple event formats
            method = (
                event.get("requestContext", {}).get("http", {}).get("method") or
                event.get("httpMethod") or
                event.get("method") or
                ""
            )
            
            if method.upper() == "OPTIONS":
                print(f"Handling OPTIONS preflight in error handler from origin: {origin}")
                return {
                    "statusCode": 200,
                    "headers": cors_headers,
                    "body": ""
                }
            
            return {
                "statusCode": 500,
                "headers": {**cors_headers, "Content-Type": "application/json"},
                "body": json.dumps({
                    "error": "Server initialization failed",
                    "message": str(e),
                    "traceback": traceback.format_exc()
                })
            }
        return error_handler

# Initialize handler at module level
handler = get_handler()