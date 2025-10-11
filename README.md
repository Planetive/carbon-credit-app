# Carbon Credit Application - Admin Setup Guide

## Service Role Key Configuration

To fix the issue where admin cannot access user profile data (display_name, organization_name), you need to configure the Supabase Service Role Key.

### Step 1: Get Your Service Role Key

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **service_role** key (not the anon key)

### Step 2: Create Environment File

Create a `.env` file in the root of your project (`carbon-credit-app/.env`) with the following content:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://yhticndmpvzczquivpfb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlodGljbmRtcHZ6Y3pxdWl2cGZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMjc4OTksImV4cCI6MjA2NzcwMzg5OX0.Oj6E-LQPDcEE2j20kzF9CMSyzboFt7Y

# IMPORTANT: Add your Supabase Service Role Key here for admin operations
VITE_SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here
```

### Step 3: Restart Development Server

After creating the `.env` file, restart your development server:

```bash
npm run dev
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Never commit the `.env` file** to version control
2. The service role key bypasses Row Level Security (RLS) policies
3. Only use this key for admin operations that need to access all user data
4. In production, ensure the service role key is properly secured

## Alternative Solutions

If you prefer not to use the service role key, you can:

1. **Modify RLS Policies**: Update the `profiles` table RLS policies to allow admin access
2. **Create Admin Users**: Add specific admin user IDs to RLS policies
3. **Use Database Functions**: Create PostgreSQL functions that bypass RLS

## Admin Access URLs

Once configured, you can access the admin panel at:

- **Admin Login**: `http://localhost:8080/admin/login`
- **Admin Dashboard**: `http://localhost:8080/admin/dashboard`
- **Admin Scoring**: `http://localhost:8080/admin/score/{assessment_id}`

## Troubleshooting

### Issue: "Unknown User" or "Unknown Organization" still showing

1. Check that the `.env` file is in the correct location
2. Verify the service role key is correct
3. Restart the development server
4. Check browser console for any errors

### Issue: Service role key not working

1. Ensure the key starts with `eyJ...`
2. Check that there are no extra spaces or characters
3. Verify the key is from the correct Supabase project

### Issue: Admin pages not loading

1. Check that you're logged in as admin
2. Clear browser localStorage and log in again
3. Verify the admin routes are properly configured in `App.tsx`

## Current Implementation Status

✅ **Completed:**
- Service role client configured in `client.ts`
- Admin components using `adminSupabase` for profile data
- Admin dashboard and scoring pages implemented
- RLS bypass for admin operations

🔄 **In Progress:**
- Testing with actual service role key
- Verification of all admin functionality

## Database Schema

The admin system works with these tables:
- `esg_assessments`: User ESG assessment data
- `esg_scores`: Admin scoring data
- `profiles`: User profile information (display_name, organization_name)

All admin operations now use the service role key to bypass RLS and access all data across these tables.
