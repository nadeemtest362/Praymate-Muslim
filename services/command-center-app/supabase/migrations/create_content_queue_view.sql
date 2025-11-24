-- Create content_queue view for easy querying of content assignments
CREATE OR REPLACE VIEW content_queue AS
SELECT 
  ca.id as assignment_id,
  ca.status,
  ca.posted_at,
  ta.handle as account_handle,
  ta.content_strategies,
  ca.asset_id,
  psa.asset_type,
  psa.metadata,
  ca.created_at,
  ca.updated_at
FROM content_assignments ca
JOIN tiktok_accounts ta ON ca.account_id = ta.id
LEFT JOIN production_session_assets psa ON ca.asset_id = psa.id
ORDER BY ca.created_at DESC;

-- Add comment explaining the view
COMMENT ON VIEW content_queue IS 'Unified view of content assignments with account and asset details for easy content queue management';

-- Grant permissions on the view
GRANT SELECT ON content_queue TO authenticated;
GRANT SELECT ON content_queue TO anon;