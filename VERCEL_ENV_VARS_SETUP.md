# Vercel Environment Variables Setup Guide

## Overview
You have **TWO separate Vercel projects**:
1. **Frontend Project** - React/Vite frontend
2. **Backend Project** - Python/FastAPI backend (serverless functions)

## Environment Variables by Project

### 🔵 BACKEND Vercel Project
**Where:** The Vercel project where `api/index.py` is deployed

**Required Environment Variables:**
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**How to get the Service Role Key:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Find **"service_role"** key (secret, not anon key)
5. Copy it

**Why:** The backend needs this to access Supabase with elevated permissions (bypasses RLS)

---

### 🟢 FRONTEND Vercel Project  
**Where:** The Vercel project where your React frontend is deployed

**Required Environment Variables:**
```
VITE_BACKEND_URL=https://your-backend-project.vercel.app
VITE_SUPABASE_URL=https://yhticndmpvzczquivpfb.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
```

**Notes:**
- `VITE_BACKEND_URL` should point to your **backend project's URL**
- Replace `your-backend-project` with your actual backend Vercel project name
- Frontend does **NOT** need `SUPABASE_SERVICE_ROLE_KEY` (that's backend only)

---

## Step-by-Step Setup

### Step 1: Add to Backend Project
1. Go to Vercel Dashboard
2. Select your **BACKEND project**
3. Go to **Settings** → **Environment Variables**
4. Add:
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** (paste service_role key from Supabase)
   - **Environment:** Production, Preview, Development (select all)
5. Click **Save**

### Step 2: Verify Frontend Project
1. Go to Vercel Dashboard
2. Select your **FRONTEND project**
3. Go to **Settings** → **Environment Variables**
4. Verify you have:
   - `VITE_BACKEND_URL` (should be your backend project URL)
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. If `VITE_BACKEND_URL` is missing or wrong, add/update it

### Step 3: Redeploy Both Projects
After adding environment variables:
1. **Backend Project:** Go to Deployments → Redeploy latest
2. **Frontend Project:** Go to Deployments → Redeploy latest

---

## Troubleshooting

### Backend Still Crashing
1. **Check Function Logs:**
   - Backend project → Deployments → Functions → `/api/index.py` → Logs
   - Look for: "SUPABASE_SERVICE_ROLE_KEY not set" error
   - If you see this, the env var wasn't added correctly

2. **Verify Environment Variable:**
   - Make sure it's named exactly: `SUPABASE_SERVICE_ROLE_KEY` (no typos)
   - Make sure it's enabled for the environment you're testing (Production/Preview)

### Frontend Getting Serverless Function Crash
If the frontend project is also showing serverless function crashes:

1. **Check if frontend has API routes:**
   - If your frontend project also has `api/index.py`, it needs `SUPABASE_SERVICE_ROLE_KEY` too
   - Or remove the API routes from frontend if they're only in backend

2. **Check if frontend is calling backend:**
   - Open browser DevTools → Network tab
   - See what URL the frontend is calling
   - If it's calling `/api/*` on the frontend domain, that's the issue
   - Frontend should call the backend project URL, not its own `/api` route

3. **Verify VITE_BACKEND_URL:**
   - Make sure `VITE_BACKEND_URL` points to your backend project
   - Should be: `https://your-backend-project.vercel.app`
   - NOT: `/api` (that's only for same-project setup)

---

## Quick Checklist

### Backend Project ✅
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set
- [ ] Environment variable enabled for all environments
- [ ] Project redeployed after adding variable

### Frontend Project ✅
- [ ] `VITE_BACKEND_URL` points to backend project URL
- [ ] `VITE_SUPABASE_URL` is set
- [ ] `VITE_SUPABASE_ANON_KEY` is set
- [ ] Project redeployed after adding/updating variables

---

## Testing

### Test Backend Directly
```bash
curl https://your-backend-project.vercel.app/health
```
Should return JSON, not error.

### Test Frontend → Backend Connection
1. Open frontend in browser
2. Open DevTools → Network tab
3. Try an action that calls the backend
4. Check if requests go to: `https://your-backend-project.vercel.app/api/...`
5. If requests go to frontend's own domain, `VITE_BACKEND_URL` is wrong

