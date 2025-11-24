-- Add SELECT policy for onboarding_analytics_events
-- Only allow specific admin user(s) to read analytics data

CREATE POLICY "Allow admin users to read analytics"
ON public.onboarding_analytics_events
FOR SELECT
TO authenticated
USING (
  auth.uid() = '40488f4e-4926-4dc0-9027-0b81d2cba249' -- Jay (admin)
  -- Add more admin user IDs here as needed:
  -- OR auth.uid() = 'another-admin-user-id'
); 