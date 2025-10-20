# Vercel Deployment Guide - Frontend + Backend

## 🚀 Deploy Both Frontend and Backend on Vercel

Your app is now configured to deploy both the React frontend and FastAPI backend on Vercel!

### 📁 File Structure Added:
- `api/index.py` - Vercel serverless function entry point
- `requirements.txt` - Python dependencies for Vercel
- Updated `vercel.json` - Configured for both frontend and backend
- Updated `src/pages/SimpleScenarioBuilding.tsx` - Dynamic API URL handling

### 🔧 How It Works:

1. **Frontend**: Serves from `/` (React app)
2. **Backend**: Serves from `/api/*` (FastAPI endpoints)
3. **Automatic Routing**: Vercel handles routing between frontend and backend

### 📋 Deployment Steps:

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "feat: Add Vercel FastAPI backend support"
   git push origin main
   ```

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will automatically detect both frontend and backend
   - Deploy!

3. **Set Environment Variables** in Vercel Dashboard:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

### 🔗 API Endpoints:

After deployment, your API will be available at:
- `https://your-app.vercel.app/api/health`
- `https://your-app.vercel.app/api/scenario/calculate`
- `https://your-app.vercel.app/api/finance-emission`
- `https://your-app.vercel.app/api/facilitated-emission`

### 🧪 Testing:

1. **Health Check**: `GET /api/health`
2. **API Docs**: `GET /api/docs` (FastAPI auto-generated docs)
3. **Frontend**: Your React app at the root URL

### 🔄 Development vs Production:

- **Development**: Frontend calls `http://127.0.0.1:8000` (local backend)
- **Production**: Frontend calls `/api` (Vercel serverless functions)

### ⚠️ Important Notes:

1. **Environment Variables**: Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel dashboard
2. **Cold Starts**: Serverless functions may have cold start delays
3. **Timeout**: Vercel has execution time limits (10s for hobby, 60s for pro)
4. **Database**: Ensure your Supabase project allows connections from Vercel

### 🐛 Troubleshooting:

1. **Build Errors**: Check Vercel build logs
2. **API Not Working**: Verify environment variables are set
3. **CORS Issues**: Already configured in FastAPI app
4. **Database Connection**: Check Supabase service role key

### 🎉 Benefits:

- ✅ **Single Platform**: Both frontend and backend on Vercel
- ✅ **Automatic Scaling**: Serverless functions scale automatically
- ✅ **Global CDN**: Fast loading worldwide
- ✅ **Easy Deployment**: Git-based deployments
- ✅ **Free Tier**: Generous free tier for development

Your app is now ready for full-stack deployment on Vercel! 🚀
