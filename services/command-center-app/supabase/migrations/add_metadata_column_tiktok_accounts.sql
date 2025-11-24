-- Add metadata column to tiktok_accounts table

ALTER TABLE tiktok_accounts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create index for faster metadata queries
CREATE INDEX IF NOT EXISTS idx_tiktok_accounts_metadata ON tiktok_accounts USING GIN (metadata);