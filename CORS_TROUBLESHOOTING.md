# CORS Troubleshooting Guide

## ✅ Changes Pushed

The CORS configuration has been updated and pushed to the backend repository:
- ✅ Updated `backend/fastapi_app/main.py` with explicit CORS origins
- ✅ Added `expose_headers` and `max_age` for better CORS handling
- ✅ Pushed to: `https://github.com/Planetive/carbon-credit-backend.git`

## 🔄 Critical Next Step: Redeploy Backend on Vercel

**The backend MUST be redeployed on Vercel for changes to take effect!**

### Option 1: Automatic Redeploy (if enabled)
- If Vercel is connected to GitHub, it should auto-deploy
- Check Vercel dashboard for deployment status

### Option 2: Manual Redeploy
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **backend project**: `carbon-credit-backend-nine`
3. Go to **Deployments** tab
4. Click **⋯** (three dots) on the latest deployment
5. Select **Redeploy**
6. Wait for deployment to complete (usually 1-2 minutes)

## 🧪 Verify Deployment

After redeployment, test the backend:

```bash
# Test health endpoint
curl https://carbon-credit-backend-nine.vercel.app/health

# Test CORS headers (should see Access-Control-Allow-Origin)
curl -I -X OPTIONS https://carbon-credit-backend-nine.vercel.app/scenario/calculate \
  -H "Origin: https://www.rethinkcarbon.io" \
  -H "Access-Control-Request-Method: POST"
```

You should see headers like:
```
Access-Control-Allow-Origin: https://www.rethinkcarbon.io
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
Access-Control-Allow-Credentials: true
```

## 🔍 Current CORS Configuration

The backend now allows:
- ✅ `https://www.rethinkcarbon.io`
- ✅ `https://rethinkcarbon.io`
- ✅ Local development ports (localhost:5173, localhost:3000)

## 🐛 If CORS Error Persists

### 1. Check Vercel Deployment Logs
- Go to Vercel dashboard → Your backend project → Deployments
- Click on the latest deployment
- Check **Build Logs** and **Function Logs** for errors

### 2. Verify Environment Variables
- In Vercel dashboard → Settings → Environment Variables
- Check if `ALLOWED_ORIGINS` is set (optional, defaults are used if not set)

### 3. Clear Browser Cache
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Or test in incognito/private window

### 4. Check Browser Console
- Open Developer Tools (F12)
- Go to Network tab
- Look for the failed request
- Check Response Headers - should see `Access-Control-Allow-Origin`

### 5. Test Backend Directly
```bash
# Test if backend is responding
curl https://carbon-credit-backend-nine.vercel.app/health

# Test CORS preflight
curl -X OPTIONS https://carbon-credit-backend-nine.vercel.app/scenario/calculate \
  -H "Origin: https://www.rethinkcarbon.io" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

## 📝 Configuration Details

The CORS middleware is configured with:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Explicit list, not "*"
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)
```

## 🚨 Common Issues

1. **Backend not redeployed**: Most common issue - changes only take effect after redeploy
2. **Browser cache**: Old CORS errors cached - clear cache
3. **Wrong origin**: Make sure frontend is using `https://www.rethinkcarbon.io` (not http)
4. **Vercel function timeout**: Check if function is timing out in logs

## ✅ Success Indicators

After proper deployment, you should see:
- ✅ No CORS errors in browser console
- ✅ API requests succeed
- ✅ Response headers include `Access-Control-Allow-Origin: https://www.rethinkcarbon.io`

