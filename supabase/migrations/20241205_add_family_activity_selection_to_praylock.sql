-- Add family_activity_selection column to store the native token for unlocking
ALTER TABLE public.praylock_settings 
ADD COLUMN IF NOT EXISTS family_activity_selection TEXT;

-- Comment for documentation
COMMENT ON COLUMN public.praylock_settings.family_activity_selection IS 'Native iOS FamilyActivitySelection token used to identify blocked apps for unlocking';