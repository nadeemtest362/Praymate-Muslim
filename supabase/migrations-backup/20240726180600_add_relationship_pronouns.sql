-- Migration: Add relationship and pronouns to prayer_focus_people table

ALTER TABLE public.prayer_focus_people
ADD COLUMN IF NOT EXISTS relationship TEXT NULL,
ADD COLUMN IF NOT EXISTS pronouns TEXT NULL; -- Store 'he', 'she', 'they', or 'name' 