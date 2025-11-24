-- Set premium access for user
UPDATE profiles 
SET 
    current_access_level = 'premium',
    premium_access_expires_at = '2025-12-31T23:59:59Z',
    updated_at = NOW()
WHERE id = 'cc535b46-2b2d-4295-b4af-5527ac3e312d';

-- Verify the update
SELECT id, current_access_level, premium_access_expires_at 
FROM profiles 
WHERE id = 'cc535b46-2b2d-4295-b4af-5527ac3e312d'; 