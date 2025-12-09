# Backend URL Clarification

## Current URLs

1. **Production URL**: `https://carbon-credit-backend-nine.vercel.app`
   - This is the main production deployment
   - Should be used in production

2. **Preview URL**: `https://carbon-credit-backend-l4zesw9py-planetive.vercel.app`
   - This is a preview deployment (notice the hash `l4zesw9py`)
   - May require authentication or may be temporary

## Which URL to Use?

### For Production Frontend:
Use: `https://carbon-credit-backend-nine.vercel.app`

### For Testing/Development:
You can use either, but the production URL is more stable.

## Update Frontend Configuration

Make sure your frontend's `VITE_BACKEND_URL` environment variable in Vercel is set to:
```
https://carbon-credit-backend-nine.vercel.app
```

## Check Vercel Dashboard

1. Go to Vercel Dashboard
2. Check which deployment is marked as "Production"
3. Use that URL for your frontend configuration

## If Preview URL is Protected

If the preview URL shows 401 Unauthorized, it might be:
- A protected preview (requires Vercel authentication)
- A deployment that hasn't finished yet
- A deployment with errors

Use the production URL instead: `https://carbon-credit-backend-nine.vercel.app`

