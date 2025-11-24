-- Fix Jason's data inconsistencies
-- User ID: 37985db6-62cc-4751-b081-1d21d296c05d

-- Mark the onboarding prayer as completed (matching user_stats timestamp)
UPDATE prayers 
SET completed_at = '2025-06-19T00:33:17.775Z'
WHERE id = 'c5f00e77-0588-4152-9c40-99a02227bc3d' 
  AND user_id = '37985db6-62cc-4751-b081-1d21d296c05d'
  AND completed_at IS NULL;

-- Verify the fix
SELECT 
  id,
  slot,
  completed_at,
  generated_at
FROM prayers 
WHERE user_id = '37985db6-62cc-4751-b081-1d21d296c05d';