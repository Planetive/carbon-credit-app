# Backend Vercel Configuration

## ⚠️ Important: Backend Repository Needs vercel.json

The backend repository at `https://github.com/Planetive/carbon-credit-backend.git` needs a `vercel.json` file in its root directory to properly route API requests.

## Current Issue

The backend is returning HTML (index.html) instead of API responses because Vercel is routing requests to the frontend instead of the API handler.

## Solution

The backend repository needs a `vercel.json` file with this configuration:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.py",
      "use": "@vercel/python"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.py"
    }
  ]
}
```

## Steps to Fix

### Option 1: Add vercel.json to Backend Repository

1. Go to the backend repository: `https://github.com/Planetive/carbon-credit-backend`
2. Create a new file `vercel.json` in the root directory
3. Copy the JSON configuration above
4. Commit and push the changes
5. Vercel will auto-deploy (or manually redeploy)

### Option 2: Rename the File (if backend-vercel.json was pushed)

If `backend-vercel.json` was pushed to the backend repo:
1. In the backend repository, rename `backend-vercel.json` to `vercel.json`
2. Commit and push
3. Redeploy on Vercel

## What This Does

- Routes ALL requests (`/(.*)`) to the API handler (`/api/index.py`)
- No frontend build - API only
- No index.html fallback - all paths go to FastAPI

## After Deployment

Test the backend:
```bash
# Should return JSON, not HTML
curl https://carbon-credit-backend-nine.vercel.app/health

# Should return API response
curl https://carbon-credit-backend-nine.vercel.app/scenario/calculate
```

## Current Status

✅ CORS configuration fixed in `backend/fastapi_app/main.py`
✅ Backend entry point exists at `api/index.py`
⚠️ **Need to add/update `vercel.json` in backend repository**

