-- Cleanup Script: Convert stored signed URLs back to storage paths
-- This removes the expiring signed URL tokens and keeps just the storage path

-- Update prayer_focus_people table to convert signed URLs to storage paths
UPDATE prayer_focus_people 
SET image_uri = regexp_replace(
  image_uri, 
  '.*/storage/v1/object/sign/user-images/([^?]+)\?.*', 
  '\1', 
  'g'
)
WHERE image_uri LIKE '%/sign/user-images/%';

-- Check results
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN image_uri LIKE '%/sign/user-images/%' THEN 1 END) as remaining_signed_urls,
  COUNT(CASE WHEN image_uri IS NOT NULL AND image_uri != '' THEN 1 END) as non_empty_images
FROM prayer_focus_people;

-- Example of what this converts:
-- FROM: https://kfrvxoxdehduqrpcbibl.supabase.co/storage/v1/object/sign/user-images/abc123/contact/photo.jpg?token=xyz&expires=123
-- TO:   abc123/contact/photo.jpg
