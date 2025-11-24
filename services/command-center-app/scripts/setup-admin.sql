-- This SQL script sets up an admin user in the Command Center
-- Run this in your Supabase SQL Editor

-- First, create the admin user in auth.users if it doesn't exist
-- Email: admin@justpray.app
-- Password: JustPrayAdmin2024! (change this after first login!)

-- Then, ensure the user has an admin profile
INSERT INTO profiles (id, email, is_admin, display_name, created_at, updated_at)
VALUES (
  '7defd8a7-eae8-4cd1-a54a-daa3db004a3a',  -- This is the user ID created earlier
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

-- Verify the admin user was created
SELECT id, email, is_admin, display_name 
FROM profiles 
WHERE email = 'admin@justpray.app';