-- Add SELECT policy for onboarding_analytics_events
-- Allow authenticated users to read analytics events (for analytics dashboards)

CREATE POLICY "Allow authenticated users to select analytics events"
ON public.onboarding_analytics_events
FOR SELECT
TO authenticated
USING (true);

-- Note: We're allowing all authenticated users to read all analytics events
-- This is necessary for admin dashboards to show aggregate analytics
-- If you need more restrictive access, you can modify the USING clause 