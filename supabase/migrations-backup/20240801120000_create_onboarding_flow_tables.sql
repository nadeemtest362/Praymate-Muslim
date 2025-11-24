-- Create a trigger function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Table for defining different onboarding flows (e.g., versions, A/B test variants)
CREATE TABLE public.onboarding_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  version VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED', 'EXPERIMENT')), -- DRAFT, ACTIVE, ARCHIVED, EXPERIMENT
  description TEXT,
  -- targeting_rules JSONB, -- For defining which users see this flow, e.g., { "new_users_only": true, "user_segment": "segment_A" }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Apply the trigger to onboarding_flows
CREATE TRIGGER on_onboarding_flows_updated
  BEFORE UPDATE ON public.onboarding_flows
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Enable RLS for onboarding_flows (default deny)
ALTER TABLE public.onboarding_flows ENABLE ROW LEVEL SECURITY;

-- Table for defining individual steps within an onboarding flow
CREATE TABLE public.onboarding_flow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.onboarding_flows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  screen_type VARCHAR(255) NOT NULL, -- Maps to a specific React Native component (e.g., "WelcomeScreen", "FirstNameInput")
  config JSONB NOT NULL, -- All dynamic content and configuration for the screen_type
  -- Example config: { "title": "Welcome!", "bodyText": "Let's get started.", "buttonText": "Next", "image_url": "...", "options": [...] }
  tracking_event_name VARCHAR(255), -- For analytics (e.g., "onboarding_welcome_viewed")
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (flow_id, step_order) -- Ensures unique step order within a flow
);

-- Apply the trigger to onboarding_flow_steps
CREATE TRIGGER on_onboarding_flow_steps_updated
  BEFORE UPDATE ON public.onboarding_flow_steps
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_updated_at();

-- Enable RLS for onboarding_flow_steps (default deny)
ALTER TABLE public.onboarding_flow_steps ENABLE ROW LEVEL SECURITY;

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_onboarding_flows_status ON public.onboarding_flows(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_flow_steps_flow_id ON public.onboarding_flow_steps(flow_id);

-- RLS Policies for Read Access by Authenticated Mobile App Users
-- Authenticated users (mobile app context, via API) can read active/experiment flows
CREATE POLICY "Authenticated users can read active/experiment flows"
ON public.onboarding_flows
FOR SELECT
TO authenticated
USING (status = 'ACTIVE' OR status = 'EXPERIMENT');

-- Authenticated users (mobile app context, via API) can read steps of accessible flows
CREATE POLICY "Authenticated users can read steps of accessible flows"
ON public.onboarding_flow_steps
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.onboarding_flows f
    WHERE f.id = flow_id AND (f.status = 'ACTIVE' OR f.status = 'EXPERIMENT')
  )
); 