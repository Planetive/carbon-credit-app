# Connect Frontend (Vercel) to Backend (Railway) - ✅ Backend Working!

## ✅ Backend Status
Your Railway backend is now **LIVE and working**:
- URL: `https://carbon-credit-backend-production.up.railway.app`
- Health check: ✅ Working
- Database: ✅ Connected

## Step 1: Update Vercel Environment Variable

1. Go to **Vercel Dashboard**: https://vercel.com/dashboard
2. Select your **FRONTEND project** (carbon-credit-app)
3. Go to **Settings** → **Environment Variables**
4. Find `VITE_BACKEND_URL` (or add it if it doesn't exist)
5. Set the value to:
   ```
   https://carbon-credit-backend-production.up.railway.app
   ```
6. Make sure it's enabled for:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development
7. Click **Save**

## Step 2: Redeploy Frontend

After updating the environment variable:

1. Go to **Deployments** tab in Vercel
2. Click the **⋯** (three dots) on the latest deployment
3. Select **Redeploy**
4. Wait for deployment to complete (2-3 minutes)

## Step 3: Verify Connection

### Test from Frontend
1. Open your deployed frontend: https://www.rethinkcarbon.io
2. Go to **Climate Risk Scenario** page
3. Try running a scenario calculation
4. Open browser **DevTools** → **Network** tab
5. You should see requests going to:
   ```
   https://carbon-credit-backend-production.up.railway.app/scenario/calculate
   ```
6. Should see successful API calls (200 status)

### Test Backend Directly (Already Working ✅)
```bash
curl https://carbon-credit-backend-production.up.railway.app/health
```

## Current Configuration

**Frontend Code** (`src/pages/SimpleScenarioBuilding.tsx`):
```typescript
const backendUrl = import.meta.env.VITE_BACKEND_URL || 
  (import.meta.env.PROD ? '/api' : 'http://127.0.0.1:8000');
const requestUrl = `${backendUrl}/scenario/calculate`;
```

**Behavior:**
- **Production**: Uses `VITE_BACKEND_URL` → Your Railway backend ✅
- **Development**: Falls back to `http://127.0.0.1:8000` (local)
- **If not set**: Falls back to `/api` (same-project backend)

## Backend CORS

✅ Your backend CORS is configured to allow all origins:
```python
allow_origins=["*"]  # Allows requests from rethinkcarbon.io
```

No CORS issues expected!

## Quick Checklist

- [x] Backend deployed on Railway ✅
- [x] Backend health check working ✅
- [ ] `VITE_BACKEND_URL` set in Vercel frontend project
- [ ] Frontend redeployed after setting env var
- [ ] Tested scenario calculation from frontend

## Next Steps

1. **Update Vercel env var** with Railway backend URL
2. **Redeploy frontend** on Vercel
3. **Test the full flow**: Frontend → Railway Backend → Supabase
4. **Monitor** Railway logs for any issues

## Troubleshooting

### Frontend Still Using Old Backend
- Make sure you redeployed after updating `VITE_BACKEND_URL`
- Clear browser cache
- Check Vercel deployment logs to verify env var is set

### CORS Errors
- Backend CORS allows all origins, so this shouldn't happen
- If you see CORS errors, verify the backend URL is correct

### 502/503 Errors from Backend
- Check Railway logs for any errors
- Verify Railway service is running (not paused)
- Test backend directly: `/health` endpoint

