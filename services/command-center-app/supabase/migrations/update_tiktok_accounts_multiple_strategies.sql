-- Update tiktok_accounts to support multiple content strategies
ALTER TABLE tiktok_accounts 
DROP COLUMN IF EXISTS content_strategy;

ALTER TABLE tiktok_accounts 
ADD COLUMN content_strategies TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Migrate existing data if needed (commented out since we just created the table)
-- UPDATE tiktok_accounts 
-- SET content_strategies = ARRAY[content_strategy]::TEXT[] 
-- WHERE content_strategy IS NOT NULL;

-- Update the content_queue view to handle multiple strategies
CREATE OR REPLACE VIEW content_queue AS
SELECT 
  ca.id as assignment_id,
  ca.status,
  ca.posted_at,
  ta.handle as account_handle,
  ta.content_strategies,
  psa.type as asset_type,
  psa.url as asset_url,
  psa.metadata,
  ps.name as session_name,
  ps.settings->>'prompt' as original_prompt,
  ps.settings->>'workflowType' as workflow_type
FROM content_assignments ca
JOIN tiktok_accounts ta ON ca.account_id = ta.id
JOIN production_session_assets psa ON ca.asset_id = psa.id
JOIN production_sessions ps ON psa.session_id = ps.id
ORDER BY ca.created_at DESC;