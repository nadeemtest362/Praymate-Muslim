-- Manual migrations to run in Supabase SQL Editor
-- Go to: https://supabase.com/dashboard/project/molydcrzwsoeyqkiofwe/sql

-- 1. Add metadata column to tiktok_accounts
ALTER TABLE tiktok_accounts 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_tiktok_accounts_metadata 
ON tiktok_accounts USING GIN (metadata);

-- 2. Create tiktok_videos table
CREATE TABLE IF NOT EXISTS tiktok_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES tiktok_accounts(id) ON DELETE CASCADE,
  tiktok_video_id TEXT NOT NULL,
  caption TEXT,
  video_url TEXT,
  cover_url TEXT,
  duration INTEGER DEFAULT 0,
  created_at_tiktok TIMESTAMPTZ,
  stats JSONB DEFAULT '{}',
  share_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id, tiktok_video_id)
);

CREATE INDEX IF NOT EXISTS idx_tiktok_videos_account_id 
ON tiktok_videos(account_id);

CREATE INDEX IF NOT EXISTS idx_tiktok_videos_created_at 
ON tiktok_videos(created_at_tiktok DESC);

-- Enable RLS
ALTER TABLE tiktok_videos ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY IF NOT EXISTS "Allow all operations on tiktok_videos for authenticated users" 
ON tiktok_videos FOR ALL USING (true);