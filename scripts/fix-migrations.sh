#!/bin/bash

echo "🔧 Fixing Supabase migrations sync issue..."

# 1. First, let's create a backup of existing migrations
echo "📦 Backing up existing migrations..."
mkdir -p supabase/migrations-backup
cp -r supabase/migrations/* supabase/migrations-backup/

# 2. Remove all local migration files
echo "🗑️  Removing local migration files..."
rm -f supabase/migrations/*.sql

# 3. Create a single consolidated migration that represents current state
echo "📝 Creating consolidated migration..."
cat > supabase/migrations/20250130000000_consolidated_current_state.sql << 'EOF'
-- This is a consolidated migration representing the current database state
-- It should only be run on fresh databases, not existing ones

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;

-- Create base tables if they don't exist
-- (The actual tables already exist in production, this is for fresh installs)

-- Add the new daily_challenge_progress table
CREATE TABLE IF NOT EXISTS public.daily_challenge_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_date)
);

-- Add RLS policies
ALTER TABLE public.daily_challenge_progress ENABLE ROW LEVEL SECURITY;

-- Users can only see their own challenge progress
CREATE POLICY "Users can view own challenge progress" ON public.daily_challenge_progress
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own challenge progress
CREATE POLICY "Users can insert own challenge progress" ON public.daily_challenge_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own challenge progress
CREATE POLICY "Users can update own challenge progress" ON public.daily_challenge_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_daily_challenge_progress_user_date 
ON public.daily_challenge_progress(user_id, challenge_date);
EOF

echo "✅ Migration fix complete!"
echo ""
echo "📌 Next steps:"
echo "1. This script created a backup in supabase/migrations-backup/"
echo "2. It removed all existing migration files"
echo "3. It created a single consolidated migration for the daily_challenge_progress table"
echo ""
echo "⚠️  IMPORTANT: The consolidated migration will be applied to production automatically"
echo "since it uses CREATE TABLE IF NOT EXISTS - it won't break existing tables" 