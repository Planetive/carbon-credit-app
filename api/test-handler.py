"""
Minimal test handler to verify Vercel Python function works
"""
def handler(event, context):
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
        },
        "body": '{"status": "ok", "message": "Test handler working"}'
    }

