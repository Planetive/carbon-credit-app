# Backend Repository Fixes Needed

## Important: Backend is in Separate Repo
Your backend is at: https://github.com/Planetive/carbon-credit-backend.git

The fixes we made to the frontend repo **do NOT apply** to the backend. You need to apply similar fixes to the backend repo.

## Issues from Build Logs

1. **Python Version**: Still using Python 3.12 instead of 3.9
   - Log shows: "No Python version specified in pyproject.toml or Pipfile.lock. Using latest installed version: 3.12"

2. **Missing Environment Variable**: `SUPABASE_SERVICE_ROLE_KEY` needs to be added to Vercel

## Fixes Needed in Backend Repo

### Fix 1: Add Python Version Specification

Add these files to the **backend repository root**:

**1. Create `pyproject.toml`:**
```toml
[tool.python]
version = "3.9"

[project]
name = "carbon-credit-backend"
version = "1.0.0"

[build-system]
requires = ["setuptools", "wheel"]
```

**2. Create `Pipfile`:**
```toml
[[source]]
url = "https://pypi.org/simple"
verify_ssl = true
name = "pypi"

[requires]
python_version = "3.9"

[packages]
fastapi = "==0.111.0"
uvicorn = {extras = ["standard"], version = "==0.30.1"}
pydantic = "==2.11.8"
supabase = "==2.18.1"
python-dotenv = "==1.0.0"
mangum = "==0.17.0"
```

**3. Create `runtime.txt`:**
```
python-3.9
```

**4. Update `vercel.json`** (if it exists in backend repo):
```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.py",
      "use": "@vercel/python",
      "config": {
        "runtime": "python3.9"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/api/index.py"
    }
  ],
  "functions": {
    "api/index.py": {
      "runtime": "python3.9"
    }
  }
}
```

### Fix 2: Add Environment Variable in Vercel

1. Go to your **Backend Vercel project** dashboard
2. Settings → Environment Variables
3. Add:
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodGljbmRtcHZ6Y3pxdWl2cGZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjEyNzg5OSwiZXhwIjoyMDY3NzAzODk5fQ.tr3naRf2yoESIz9g2LsHCUVMaJo-ZaH-m9umFY0ET_M`
   - **Environment:** Production, Preview, Development (all)
4. Save and redeploy

## Steps to Apply Fixes

### Option A: Clone and Fix Locally
```bash
# Clone the backend repo
git clone https://github.com/Planetive/carbon-credit-backend.git
cd carbon-credit-backend

# Add the files (pyproject.toml, Pipfile, runtime.txt)
# Update vercel.json if needed

# Commit and push
git add .
git commit -m "Fix Python version to 3.9 and add version specification files"
git push origin main
```

### Option B: Add Files via GitHub Web Interface
1. Go to https://github.com/Planetive/carbon-credit-backend
2. Click "Add file" → "Create new file"
3. Create each file: `pyproject.toml`, `Pipfile`, `runtime.txt`
4. Commit directly to main branch

## After Applying Fixes

1. **Wait for Vercel to redeploy** (automatic after push)
2. **Check new build logs** - should show Python 3.9
3. **Test backend**: `https://carbon-credit-backend-nine.vercel.app/health`
4. Should return JSON, not error

## Current Backend URL
Based on the repo, your backend is at: `carbon-credit-backend-nine.vercel.app`

Make sure your frontend's `VITE_BACKEND_URL` points to:
```
https://carbon-credit-backend-nine.vercel.app
```

