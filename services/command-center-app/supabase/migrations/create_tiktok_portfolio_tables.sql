-- Create tiktok_accounts table
CREATE TABLE IF NOT EXISTS tiktok_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT,
  content_strategies TEXT[] DEFAULT '{}',
  posting_schedule JSONB DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create content_assignments table
CREATE TABLE IF NOT EXISTS content_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES tiktok_accounts(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  posted_at TIMESTAMPTZ,
  performance_notes TEXT,
  engagement_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create production_session_assets table if it doesn't exist
CREATE TABLE IF NOT EXISTS production_session_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  asset_type TEXT NOT NULL, -- 'image' or 'video'
  asset_id UUID, -- references either gtm_image_assets or gtm_video_assets
  order_index INTEGER DEFAULT 0,
  assignment_status TEXT DEFAULT 'unassigned',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on production_session_assets
CREATE INDEX IF NOT EXISTS idx_production_session_assets_session_id ON production_session_assets(session_id);
CREATE INDEX IF NOT EXISTS idx_production_session_assets_asset_type ON production_session_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_production_session_assets_assignment_status ON production_session_assets(assignment_status);

-- Add trigger for production_session_assets
CREATE TRIGGER set_timestamp_production_session_assets
  BEFORE UPDATE ON production_session_assets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- Enable RLS on production_session_assets
ALTER TABLE production_session_assets ENABLE ROW LEVEL SECURITY;

-- RLS policy for production_session_assets
CREATE POLICY "Allow all operations on production_session_assets" ON production_session_assets
  FOR ALL USING (true);

-- Add comments for production_session_assets
COMMENT ON TABLE production_session_assets IS 'Links assets to production sessions for content management';
COMMENT ON COLUMN production_session_assets.asset_type IS 'Type of asset: image or video';
COMMENT ON COLUMN production_session_assets.assignment_status IS 'Status of content assignment: unassigned, assigned, posted';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_content_assignments_asset_id ON content_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_content_assignments_account_id ON content_assignments(account_id);
CREATE INDEX IF NOT EXISTS idx_content_assignments_status ON content_assignments(status);
CREATE INDEX IF NOT EXISTS idx_tiktok_accounts_handle ON tiktok_accounts(handle);

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_tiktok_accounts
  BEFORE UPDATE ON tiktok_accounts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_content_assignments
  BEFORE UPDATE ON content_assignments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

-- Add RLS (Row Level Security) policies
ALTER TABLE tiktok_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_assignments ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can restrict these later based on your auth requirements)
CREATE POLICY "Allow all operations on tiktok_accounts" ON tiktok_accounts
  FOR ALL USING (true);

CREATE POLICY "Allow all operations on content_assignments" ON content_assignments
  FOR ALL USING (true);

-- Add some helpful comments
COMMENT ON TABLE tiktok_accounts IS 'Stores TikTok account information for content distribution';
COMMENT ON TABLE content_assignments IS 'Tracks which content assets are assigned to which TikTok accounts';
COMMENT ON COLUMN tiktok_accounts.content_strategies IS 'Array of content strategy tags for this account';
COMMENT ON COLUMN tiktok_accounts.posting_schedule IS 'JSON object defining posting schedule preferences';
COMMENT ON COLUMN content_assignments.engagement_data IS 'JSON object storing engagement metrics after posting';