-- Add input_snapshot column to prayers table
ALTER TABLE prayers
ADD COLUMN input_snapshot jsonb;

-- Add comment to describe the column
COMMENT ON COLUMN prayers.input_snapshot IS 'Stores the full context snapshot at prayer generation time including user mood, active intentions, and session changes'; 