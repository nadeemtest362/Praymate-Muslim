-- Migration: Add tables and columns for OpenAI prayer generation and persistence

-- Add openai_conversation_id to profiles table IF NOT EXISTS
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS openai_conversation_id TEXT NULL;

-- Remove deprecated columns from profiles (assuming they are no longer needed)
-- Note: DROP COLUMN IF EXISTS is already idempotent
ALTER TABLE public.profiles
DROP COLUMN IF EXISTS gratitude,
DROP COLUMN IF EXISTS challenge,
DROP COLUMN IF EXISTS hope,
DROP COLUMN IF EXISTS tone_preference;
-- Note: Consider implications if data exists in these columns before dropping.

-- Create prayer_focus_people table IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.prayer_focus_people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    image_uri TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_gratitude_prompt_id TEXT NULL,
    current_gratitude_detail TEXT NULL,
    current_challenge_prompt_id TEXT NULL,
    current_challenge_detail TEXT NULL,
    current_hope_prompt_id TEXT NULL,
    current_hope_detail TEXT NULL
);

-- Add indexes for frequently queried columns (Assume indexes might exist, handle potential errors if needed or add IF NOT EXISTS)
-- Consider adding IF NOT EXISTS for index creation if supported or handle errors during push
CREATE INDEX IF NOT EXISTS idx_prayer_focus_people_user_id ON public.prayer_focus_people(user_id);

-- Enable Row Level Security (RLS) - This is generally safe to run multiple times
ALTER TABLE public.prayer_focus_people ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for prayer_focus_people (Drop then Create)
-- Allow users to select their own focus people
DROP POLICY IF EXISTS "Allow users to select own focus people" ON public.prayer_focus_people;
CREATE POLICY "Allow users to select own focus people"
ON public.prayer_focus_people
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own focus people
DROP POLICY IF EXISTS "Allow users to insert own focus people" ON public.prayer_focus_people;
CREATE POLICY "Allow users to insert own focus people"
ON public.prayer_focus_people
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own focus people
DROP POLICY IF EXISTS "Allow users to update own focus people" ON public.prayer_focus_people;
CREATE POLICY "Allow users to update own focus people"
ON public.prayer_focus_people
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own focus people
DROP POLICY IF EXISTS "Allow users to delete own focus people" ON public.prayer_focus_people;
CREATE POLICY "Allow users to delete own focus people"
ON public.prayer_focus_people
FOR DELETE
USING (auth.uid() = user_id);


-- Create prayers table IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.prayers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    prayer_text TEXT NOT NULL,
    openai_conversation_id TEXT NULL,
    input_snapshot JSONB NOT NULL
);

-- Add indexes for frequently queried columns (Assume indexes might exist)
-- Consider adding IF NOT EXISTS for index creation if supported or handle errors during push
CREATE INDEX IF NOT EXISTS idx_prayers_user_id_generated_at ON public.prayers(user_id, generated_at DESC);

-- Enable Row Level Security (RLS) - Safe to run multiple times
ALTER TABLE public.prayers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for prayers (Drop then Create)
-- Allow users to select their own prayers
DROP POLICY IF EXISTS "Allow users to select own prayers" ON public.prayers;
CREATE POLICY "Allow users to select own prayers"
ON public.prayers
FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to insert their own prayers (assuming backend function handles this securely)
DROP POLICY IF EXISTS "Allow users to insert own prayers" ON public.prayers;
CREATE POLICY "Allow users to insert own prayers"
ON public.prayers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own prayers (if needed)
DROP POLICY IF EXISTS "Allow users to delete own prayers" ON public.prayers;
CREATE POLICY "Allow users to delete own prayers"
ON public.prayers
FOR DELETE
USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp (Use CREATE OR REPLACE)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on prayer_focus_people table (Check existence)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_prayer_focus_people_updated_at' AND tgrelid = 'public.prayer_focus_people'::regclass
  ) THEN
    CREATE TRIGGER update_prayer_focus_people_updated_at
    BEFORE UPDATE ON public.prayer_focus_people
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Trigger to update updated_at on profiles table (Check existence)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_profiles_updated_at' AND tgrelid = 'public.profiles'::regclass
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$; 