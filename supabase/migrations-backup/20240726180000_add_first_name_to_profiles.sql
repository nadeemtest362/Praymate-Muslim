-- Migration: Add first_name to profiles table

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name TEXT NULL; 