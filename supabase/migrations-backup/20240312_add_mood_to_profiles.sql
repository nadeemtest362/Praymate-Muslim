-- Add 'mood' column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mood TEXT;

-- Add comment for the column
COMMENT ON COLUMN public.profiles.mood IS 'Stores the user''s current emotional state for prayer customization'; 