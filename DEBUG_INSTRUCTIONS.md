# Debugging Vercel Function Crash

## Current Status
The function is crashing with `FUNCTION_INVOCATION_FAILED`. I've added detailed error logging.

## Steps to Debug

### 1. Check Vercel Function Logs

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select project: `carbon-credit-backend-nine`
3. Go to **Deployments** → Latest deployment
4. Click on **Functions** tab
5. Click on the function (should be `/api/index.py` or similar)
6. Check **Logs** tab

You should see detailed error messages starting with:
```
Starting handler initialization...
Current directory: ...
Python path: ...
```

This will tell us exactly what's failing.

### 2. Check Build Logs

1. In the same deployment page
2. Go to **Build Logs** tab
3. Look for any errors during:
   - Dependency installation
   - Python package installation
   - Build process

### 3. Verify Environment Variables

1. Go to **Settings** → **Environment Variables**
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
3. Check if there are any other required variables

### 4. Test with Minimal Handler

If the full handler fails, we can test with a minimal version. The error logs will show us what's wrong.

## Common Issues

### Issue 1: Missing Dependencies
**Symptom**: ImportError for mangum, fastapi, etc.
**Fix**: Ensure `requirements.txt` is in the root and has all dependencies

### Issue 2: Path Resolution
**Symptom**: ModuleNotFoundError for fastapi_app
**Fix**: Check if backend directory structure matches what's expected

### Issue 3: Environment Variable
**Symptom**: Database connection errors
**Fix**: Set SUPABASE_SERVICE_ROLE_KEY in Vercel

### Issue 4: Syntax Error
**Symptom**: SyntaxError in logs
**Fix**: Check Python version compatibility

## What to Share

Please share:
1. The error message from Function Logs
2. Any errors from Build Logs
3. The structure of your backend repository (if different from frontend)

This will help identify the exact issue.

