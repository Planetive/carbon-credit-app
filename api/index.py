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
    print(f"DEBUG get_cors_headers: origin={origin}")
    
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
        print(f"DEBUG: Origin {origin} is in allowed list")
    # Allow any localhost or 127.0.0.1 origin for dev (MOST IMPORTANT FOR LOCAL DEV)
    elif origin and (origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:")):
        allow_origin = origin  # Allow any localhost origin for dev
        print(f"DEBUG: Origin {origin} is localhost/127.0.0.1, allowing")
    # Allow production origins
    elif origin and (origin.startswith("https://") and ("rethinkcarbon.io" in origin or "rethinkcarbon" in origin)):
        allow_origin = origin
        print(f"DEBUG: Origin {origin} is production domain, allowing")
    else:
        # Default behavior: if origin provided but not recognized, still allow it for localhost
        if origin and (origin.startswith("http://localhost:") or origin.startswith("http://127.0.0.1:")):
            allow_origin = origin
            print(f"DEBUG: Origin {origin} is localhost variant, allowing")
        elif origin:
            # Unknown origin - be permissive for now but log it
            allow_origin = origin
            print(f"DEBUG: WARNING - Unknown origin {origin}, allowing anyway (should be restricted in production)")
        else:
            # No origin - default to allowing localhost for dev, production for prod
            # Can't use wildcard with credentials, so default to a safe option
            allow_origin = "http://localhost:8080"  # Default to common dev port
            print(f"DEBUG: No origin provided, defaulting to {allow_origin} (should not happen in production)")
    
    cors_headers = {
        "Access-Control-Allow-Origin": allow_origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept, Origin, X-Requested-With, Access-Control-Request-Method, Access-Control-Request-Headers",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "3600",
    }
    
    print(f"DEBUG: Returning CORS headers with origin: {allow_origin}")
    return cors_headers

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
                # DEBUG: Log entire event structure
                print("=" * 80)
                print("DEBUG: Incoming request event structure:")
                print(f"Event keys: {list(event.keys())}")
                print(f"Event type: {type(event)}")
                print(f"Full event (first 2000 chars): {str(event)[:2000]}")
                if "requestContext" in event:
                    print(f"requestContext: {event.get('requestContext')}")
                if "path" in event:
                    print(f"Path: {event.get('path')}")
                if "rawPath" in event:
                    print(f"Raw path: {event.get('rawPath')}")
                print("=" * 80)
                
                # Extract origin from request headers (Vercel uses lowercase keys)
                headers = event.get("headers", {}) or {}
                print(f"DEBUG: All headers: {headers}")
                
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
                            print(f"DEBUG: Extracted origin from referer: {origin}")
                        except Exception as e:
                            print(f"DEBUG: Failed to extract origin from referer: {e}")
                
                print(f"DEBUG: Final origin: {origin}, headers keys: {list(headers.keys())}")
                
                # Get CORS headers based on origin - ALWAYS generate them first
                cors_headers = get_cors_headers(origin)
                print(f"DEBUG: Generated CORS headers: {cors_headers}")
                
                # CRITICAL: Check for OPTIONS preflight requests FIRST, before method detection
                # This is the most reliable way to detect preflight requests
                has_cors_preflight_headers = (
                    headers.get("access-control-request-method") or 
                    headers.get("Access-Control-Request-Method") or 
                    headers.get("ACCESS-CONTROL-REQUEST-METHOD") or
                    headers.get("access-control-request-headers") or
                    headers.get("Access-Control-Request-Headers") or
                    headers.get("ACCESS-CONTROL-REQUEST-HEADERS")
                )
                
                # Handle OPTIONS preflight requests directly
                # Vercel Python runtime event format - check multiple possible locations
                method = None
                
                # Try Vercel's event format first (requestContext.http.method)
                if "requestContext" in event:
                    http_info = event.get("requestContext", {}).get("http", {})
                    if http_info:
                        method = http_info.get("method")
                        print(f"DEBUG: Found method in requestContext.http.method: {method}")
                
                # Fallback to other possible formats
                if not method:
                    method = event.get("httpMethod") or event.get("method") or event.get("requestMethod")
                    if method:
                        print(f"DEBUG: Found method in event: {method}")
                
                # Check if it's an OPTIONS request - be VERY aggressive
                is_options = False
                
                # Method-based detection
                if method:
                    is_options = method.upper() == "OPTIONS"
                    print(f"DEBUG: Method-based OPTIONS detection: {is_options}")
                
                # Preflight header detection (MOST RELIABLE)
                if has_cors_preflight_headers:
                    is_options = True
                    method = "OPTIONS"
                    print(f"DEBUG: Detected OPTIONS from CORS preflight headers")
                
                # Path-based detection as last resort
                if not is_options:
                    path = event.get("path") or event.get("rawPath") or event.get("rawUrl", "") or ""
                    # If we have a path and it's a known endpoint, and we have origin but no method
                    # it might be a preflight
                    if path and ("/scenario/calculate" in path or "/finance-emission" in path or "/facilitated-emission" in path):
                        if origin and not method:
                            is_options = True
                            method = "OPTIONS"
                            print(f"DEBUG: Detected OPTIONS from path pattern: {path}")
                
                print(f"DEBUG: Request method: {method}, is_options: {is_options}, origin: {origin}")
                print(f"DEBUG: Has CORS preflight headers: {has_cors_preflight_headers}")
                
                # ALWAYS handle OPTIONS requests immediately with CORS headers
                if is_options or has_cors_preflight_headers:
                    print(f"DEBUG: Handling OPTIONS preflight request from origin: {origin}")
                    print(f"DEBUG: Returning OPTIONS response with headers: {cors_headers}")
                    
                    # Ensure all required CORS headers are present
                    final_cors_headers = cors_headers.copy()
                    # Make sure we have all required headers
                    if "Access-Control-Allow-Origin" not in final_cors_headers:
                        final_cors_headers["Access-Control-Allow-Origin"] = origin if origin else "http://localhost:8080"
                    
                    response = {
                        "statusCode": 200,
                        "headers": final_cors_headers,
                        "body": ""
                    }
                    print(f"DEBUG: OPTIONS response status: {response['statusCode']}")
                    print(f"DEBUG: OPTIONS response headers: {response['headers']}")
                    print(f"DEBUG: OPTIONS Access-Control-Allow-Origin: {response['headers'].get('Access-Control-Allow-Origin')}")
                    return response
                
                # Call the actual handler
                print(f"DEBUG: Calling mangum handler for {method} request")
                response = mangum_handler(event, context)
                print(f"DEBUG: Mangum handler returned: {type(response)}, keys: {list(response.keys()) if isinstance(response, dict) else 'N/A'}")
                
                # CRITICAL: Ensure CORS headers are ALWAYS added to the response
                # This is essential for all requests, not just OPTIONS
                if isinstance(response, dict):
                    if "headers" not in response:
                        response["headers"] = {}
                    # Merge CORS headers, ensuring they're not overwritten
                    # Use update() to preserve existing headers but add CORS
                    for key, value in cors_headers.items():
                        if key not in response["headers"]:
                            response["headers"][key] = value
                    print(f"DEBUG: Final response headers: {response.get('headers')}")
                    print(f"DEBUG: CORS headers in response: Access-Control-Allow-Origin = {response.get('headers', {}).get('Access-Control-Allow-Origin')}")
                else:
                    print(f"DEBUG: WARNING - Response is not a dict: {type(response)}")
                    # Convert to dict if possible, or create error response with CORS
                    if hasattr(response, '__dict__'):
                        response = response.__dict__
                        response["headers"] = cors_headers
                    else:
                        # Last resort: create a proper response dict
                        response = {
                            "statusCode": 500,
                            "headers": cors_headers,
                            "body": json.dumps({"error": "Invalid response format"})
                        }
                
                return response
                
            except Exception as e:
                # Even on error, return CORS headers
                print("=" * 80)
                print("DEBUG: Exception caught in wrapped_handler")
                print(f"DEBUG: Error type: {type(e).__name__}")
                print(f"DEBUG: Error message: {str(e)}")
                print(f"DEBUG: Traceback:\n{traceback.format_exc()}")
                print("=" * 80)
                
                headers = event.get("headers", {}) or {}
                origin = headers.get("origin") or headers.get("Origin") or headers.get("ORIGIN") or None
                print(f"DEBUG: Error handler - origin: {origin}")
                cors_headers = get_cors_headers(origin)
                print(f"DEBUG: Error handler - CORS headers: {cors_headers}")
                
                error_response = {
                    "statusCode": 500,
                    "headers": {**cors_headers, "Content-Type": "application/json"},
                    "body": json.dumps({
                        "error": "Internal server error",
                        "message": str(e),
                        "traceback": traceback.format_exc() if os.getenv("DEBUG", "false").lower() == "true" else None
                    })
                }
                print(f"DEBUG: Error response: {error_response}")
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