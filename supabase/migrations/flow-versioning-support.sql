-- Add flow version tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS onboarding_flow_id UUID REFERENCES onboarding_flows(id),
ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS onboarding_current_step INTEGER;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_flow_id ON profiles(onboarding_flow_id);

-- Add comment for clarity
COMMENT ON COLUMN profiles.onboarding_flow_id IS 'The specific flow version the user started onboarding with';
COMMENT ON COLUMN profiles.onboarding_current_step IS 'Current step order in their flow (1-based)'; 