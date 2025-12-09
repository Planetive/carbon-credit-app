# Vercel Backend Integration Setup

## Quick Setup

Your frontend is now configured to use the Vercel backend. Follow these steps:

### Step 1: Determine Your Backend URL

**Option A: Backend in Same Vercel Project**
- If your backend API is deployed in the same Vercel project (using `api/index.py`), use:
  ```
  /api
  ```

**Option B: Backend in Separate Vercel Project**
- If your backend is deployed separately, use the full URL:
  ```
  https://your-backend-project.vercel.app
  ```
  Replace `your-backend-project` with your actual Vercel project name.

### Step 2: Set Environment Variable in Vercel

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your **frontend** project
3. Go to **Settings** → **Environment Variables**
4. Add a new environment variable:
   - **Name**: `VITE_BACKEND_URL`
   - **Value**: 
     - Use `/api` if backend is in the same project
     - Use `https://your-backend.vercel.app` if backend is separate
   - **Environment**: Select all (Production, Preview, Development)
5. Click **Save**

### Step 3: Redeploy

After adding the environment variable:
1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Select **Redeploy**
4. Or push a new commit to trigger automatic redeployment

### Step 4: Verify

Test the backend connection:
1. Open your deployed frontend
2. Navigate to the Climate Risk Scenario page
3. Try running a scenario calculation
4. Check browser console for any API errors

## Current Configuration

- **Local Development**: Uses `http://127.0.0.1:8000` (fallback)
- **Production**: Uses `VITE_BACKEND_URL` environment variable
- **API Endpoint**: The frontend calls `${VITE_BACKEND_URL}/scenario/calculate`

## Troubleshooting

### Backend Not Responding
- Verify the backend URL is correct in Vercel environment variables
- Check that the backend is deployed and accessible
- Test the backend directly: `https://your-backend.vercel.app/health`

### CORS Errors
- If backend is on a separate domain, ensure CORS is configured in the backend
- Add your frontend domain to allowed origins in FastAPI CORS settings

### Environment Variable Not Working
- Make sure you redeployed after adding the variable
- Check that the variable name is exactly `VITE_BACKEND_URL` (case-sensitive)
- Verify it's set for the correct environment (Production/Preview/Development)

## Files Modified

- `.env` - Added `VITE_BACKEND_URL` configuration
- `vercel.json` - Added API route handling for same-project deployment
- `src/pages/SimpleScenarioBuilding.tsx` - Already configured to use `VITE_BACKEND_URL`

