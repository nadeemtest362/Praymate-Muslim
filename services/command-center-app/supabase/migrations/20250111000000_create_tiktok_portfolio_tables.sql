-- Create TikTok accounts table
CREATE TABLE IF NOT EXISTS tiktok_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  content_strategies TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create content assignments table
CREATE TABLE IF NOT EXISTS content_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES tiktok_accounts(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  asset_id TEXT NOT NULL,
  asset_url TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  caption TEXT,
  workflow_type TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'scheduled')),
  posted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_assignments_account_id ON content_assignments(account_id);
CREATE INDEX IF NOT EXISTS idx_content_assignments_session_id ON content_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_content_assignments_status ON content_assignments(status);

-- Add RLS policies
ALTER TABLE tiktok_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_assignments ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users" ON tiktok_accounts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for authenticated users" ON content_assignments
  FOR ALL USING (true) WITH CHECK (true);