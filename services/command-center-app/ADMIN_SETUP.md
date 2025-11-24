# Command Center Admin Setup

The Command Center requires admin privileges to access. Here's how to set up your admin account:

## Quick Setup

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/kfrvxoxdehduqrpcbibl)
2. Navigate to the SQL Editor
3. Run this SQL query:

```sql
-- Create admin profile for existing user
INSERT INTO profiles (id, email, is_admin, display_name, created_at, updated_at)
VALUES (
  '7defd8a7-eae8-4cd1-a54a-daa3db004a3a',
  'admin@justpray.app',
  true,
  'Admin',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
  is_admin = true,
  email = 'admin@justpray.app',
  updated_at = NOW();
```

4. Login with:
   - **Email**: `admin@justpray.app`
   - **Password**: `JustPrayAdmin2024!`

### Option 2: Using the Setup Script

If you have the Supabase service role key:

```bash
# Add service role key to .env
echo "SUPABASE_SERVICE_ROLE_KEY=your-service-role-key" >> .env

# Run the setup script
pnpm tsx scripts/create-admin-user.ts
```

## Important Notes

- **Change the password** immediately after your first login
- The Command Center is admin-only - regular users cannot access it
- Admin status is controlled by the `is_admin` field in the `profiles` table

## Troubleshooting

If you're having issues:

1. Check that the user exists in Authentication > Users in Supabase
2. Verify the profile exists with `is_admin = true` in the profiles table
3. Clear your browser's localStorage and cookies for the app
4. Check the browser console for specific error messages

## Why This Happened

The Command Center requires both:
1. Valid authentication (user exists in auth.users)
2. Admin privileges (is_admin = true in profiles table)

The app was checking for admin status but no admin users were created in the database.