-- Add family_activity_selection column to praylock_settings
ALTER TABLE public.praylock_settings 
ADD COLUMN IF NOT EXISTS family_activity_selection TEXT;

-- Comment on the column
COMMENT ON COLUMN public.praylock_settings.family_activity_selection IS 'Base64-encoded FamilyActivitySelection token from iOS Screen Time API';

-- Update the reset function to handle the new column (optional - the column allows NULL so existing function should still work)