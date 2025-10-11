# Backend Setup Guide

## Prerequisites
- Python 3.8+
- Your Supabase Service Role Key

## Installation

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Configuration
1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. Get your Supabase Service Role Key:
   - Go to your Supabase project dashboard
   - Navigate to **Settings** → **API**
   - Copy the **service_role** key (not the anon key)

3. Update `.env` file:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
   ```

### 3. Test the Setup
```bash
# Start the backend server
uvicorn fastapi_app.main:app --reload --port 8000

# In another terminal, test the connection
curl http://localhost:8000/health
curl http://localhost:8000/test-db
```

## Expected Results

### Health Check (`/health`)
```json
{
  "status": "ok",
  "engine_version": "pcaf-engine-0.1.0",
  "database_status": "connected"
}
```

### Database Test (`/test-db`)
```json
{
  "status": "success",
  "message": "Database connection successful",
  "tables_accessible": true,
  "sample_data_count": 0
}
```

## Troubleshooting

### Database Connection Issues
1. **Check Service Role Key**: Make sure you're using the `service_role` key, not the `anon` key
2. **Environment Variables**: Ensure `.env` file is in the `backend/` directory
3. **Network Access**: Verify your IP is allowed in Supabase settings

### Common Errors
- `SUPABASE_SERVICE_ROLE_KEY not set`: Check your `.env` file
- `Database connection test failed`: Verify your service role key is correct
- `Permission denied`: Ensure you're using the service role key, not anon key

## Security Notes
- ⚠️ **Never commit the `.env` file** to version control
- The service role key bypasses Row Level Security (RLS)
- Only use this key for backend operations
- In production, use environment variables or secure key management
