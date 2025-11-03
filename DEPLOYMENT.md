# Backend Deployment Guide

## 🚀 Quick Deployment Options

### Option 1: Railway (Recommended)

1. **Go to [railway.app](https://railway.app)**
2. **Sign up with GitHub**
3. **Create New Project:**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your backend repository
   - Railway will auto-detect Python

4. **Configure Environment Variables:**
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

5. **Deploy:**
   - Railway will automatically build and deploy
   - Your backend will be available at: `https://your-app-name.railway.app`

### Option 2: Render

1. **Go to [render.com](https://render.com)**
2. **Sign up and connect GitHub**
3. **Create Web Service:**
   - Click "New" → "Web Service"
   - Connect your repository
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn fastapi_app.main:app --host 0.0.0.0 --port $PORT`

4. **Set Environment Variables:**
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

### Option 3: Heroku

1. **Install Heroku CLI**
2. **Login and create app:**
   ```bash
   heroku login
   heroku create your-app-name
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

4. **Deploy:**
   ```bash
   git push heroku main
   ```

## 🔧 Environment Variables Needed

You'll need to set these environment variables in your hosting platform:

```
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

**To get your Service Role Key:**
1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **service_role** key (not the anon key)

## 🧪 Test Your Deployment

Once deployed, test these endpoints:
- `GET /health` - Health check
- `GET /docs` - API documentation
- `POST /scenario/calculate` - Your main endpoint

## 🚨 Important Notes

1. **Never commit your `.env` file** with real keys
2. **Use environment variables** in your hosting platform
3. **Test locally first** before deploying
4. **Monitor your backend logs** for any errors

## 🔗 Frontend Integration

After deploying your backend, update your frontend to use the new backend URL:

1. **Find your backend URL** (e.g., `https://your-app.railway.app`)
2. **Update the API calls** in your frontend code
3. **Redeploy your frontend**

## 📝 Next Steps

1. Create a new GitHub repository for this backend
2. Push this code to the new repository
3. Deploy using one of the options above
4. Update your frontend to use the new backend URL
5. Test the full application
