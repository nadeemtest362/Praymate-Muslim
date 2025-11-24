-- Emergency reset for onboarding crash
-- Run this in Supabase SQL editor to fix the crash

-- First, find your user ID by email
SELECT id, email, display_name, has_completed_onboarding, onboarding_completed_at
FROM profiles
WHERE email = 'YOUR_EMAIL_HERE';

-- Then run this with your user ID to reset onboarding
UPDATE profiles
SET 
  has_completed_onboarding = false,
  onboarding_completed_at = NULL,
  current_access_level = 'free',
  premium_access_expires_at = NULL
WHERE id = 'YOUR_USER_ID_HERE';

-- Optionally, if you want to clear all onboarding data and start fresh:
-- DELETE FROM prayer_intentions WHERE user_id = 'YOUR_USER_ID_HERE';
-- DELETE FROM prayer_focus_people WHERE user_id = 'YOUR_USER_ID_HERE';
-- DELETE FROM prayers WHERE user_id = 'YOUR_USER_ID_HERE' AND slot = 'onboarding-initial'; 