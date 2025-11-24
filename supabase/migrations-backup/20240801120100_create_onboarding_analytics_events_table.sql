-- Table for logging granular onboarding analytics events
CREATE TABLE public.onboarding_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Link to the authenticated user
  flow_id UUID NOT NULL REFERENCES public.onboarding_flows(id) ON DELETE CASCADE,
  step_id UUID REFERENCES public.onboarding_flow_steps(id) ON DELETE CASCADE, -- Nullable for flow-level events
  event_name VARCHAR(255) NOT NULL,
  session_id UUID, -- Optional: client-generated temporary ID for the session
  event_data JSONB -- For any additional data specific to the event
);

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON public.onboarding_analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_flow_id ON public.onboarding_analytics_events(flow_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON public.onboarding_analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.onboarding_analytics_events(created_at DESC);

-- Enable RLS for onboarding_analytics_events (default deny)
ALTER TABLE public.onboarding_analytics_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Authenticated users can insert events for themselves (via Edge Function that validates user_id against auth.uid())
CREATE POLICY "Allow authenticated users to insert their own analytics events"
ON public.onboarding_analytics_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Service role (and by extension, admins via Command Center backend) can do anything.
-- Other roles (like a direct authenticated user trying to SELECT/UPDATE/DELETE) are denied by default RLS enablement.
-- No explicit SELECT/UPDATE/DELETE policies are needed for `authenticated` role here if all reads/admin ops go via service_role. 