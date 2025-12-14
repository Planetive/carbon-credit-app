# Vercel Python Serverless Function Crash Fix

## Problem
The serverless function is crashing with "This Serverless Function has crashed" error.

## Root Causes
1. **Python Version**: Vercel might be using an incompatible Python version
2. **Dependencies**: Missing or incorrect `requirements.txt` location
3. **Path Resolution**: Backend directory not found during initialization
4. **Environment Variables**: Missing `SUPABASE_SERVICE_ROLE_KEY`

## Fixes Applied

### 1. Python Version Specification
- Created `.python-version` file specifying Python 3.9
- This ensures Vercel uses the correct Python runtime

### 2. Requirements.txt
- Updated root `requirements.txt` with correct pydantic version (2.11.8)
- Created `api/requirements.txt` as backup
- Both files now match `backend/requirements.txt`

### 3. Vercel Configuration
- Updated `vercel.json` with proper routing
- Removed deprecated `functions` runtime specification (Vercel auto-detects)

## Steps to Fix in Vercel Dashboard

### Option 1: Set Python Version in Vercel Settings
1. Go to Vercel Dashboard → Your Project
2. Go to **Settings** → **General**
3. Scroll to **Node.js Version** section
4. **IMPORTANT**: This is for Node.js, NOT Python
5. For Python, Vercel uses the `.python-version` file (already created)

### Option 2: Check Environment Variables
1. Go to **Settings** → **Environment Variables**
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
3. Make sure it's set for **Production**, **Preview**, and **Development**

### Option 3: Check Function Logs
1. Go to **Deployments** → Latest deployment
2. Click **Functions** tab
3. Click on the function (usually `/api/index.py`)
4. Check **Logs** tab for error messages
5. Look for:
   - Import errors
   - Path resolution errors
   - Missing environment variables

## Common Error Messages and Fixes

### Error: "ModuleNotFoundError: No module named 'fastapi_app'"
**Fix**: The backend directory path is incorrect. Check that `backend/` folder exists in the repository root.

### Error: "ImportError: cannot import name 'app' from 'fastapi_app.main'"
**Fix**: Check that `backend/fastapi_app/main.py` exists and exports `app`.

### Error: "FUNCTION_INVOCATION_FAILED"
**Fix**: Check function logs for the actual error. Usually it's:
- Missing dependencies (check requirements.txt)
- Environment variable not set
- Python version mismatch

### Error: "Handler initialization failed"
**Fix**: Check the detailed logs. The handler prints debug information that will show exactly what's failing.

## Verification Steps

1. **Check Build Logs**:
   - Go to deployment → **Build Logs**
   - Look for "Installing dependencies from requirements.txt"
   - Should see "Successfully installed" messages

2. **Check Function Logs**:
   - Should see "Starting handler initialization..."
   - Should see "✓ Mangum imported successfully"
   - Should see "✓ FastAPI app imported successfully"
   - Should see "✓ Mangum handler created successfully"

3. **Test the Function**:
   ```bash
   curl https://your-project.vercel.app/api/health
   ```
   Should return JSON response, not HTML error page.

## If Still Not Working

1. **Redeploy**: Push a new commit or manually redeploy
2. **Check Vercel Status**: https://www.vercel-status.com/
3. **Contact Support**: If logs show no errors but function still crashes

## Files Modified
- ✅ `vercel.json` - Updated routing configuration
- ✅ `requirements.txt` - Fixed pydantic version
- ✅ `api/requirements.txt` - Created as backup
- ✅ `.python-version` - Specified Python 3.9

