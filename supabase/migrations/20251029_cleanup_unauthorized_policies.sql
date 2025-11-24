-- Cleanup migration for unauthorized policy/index changes
-- Removes overly permissive policies and duplicate indexes added without review

-- 1. Drop the security hole: public read access to ALL flow steps (including DRAFT)
DROP POLICY IF EXISTS "Allow public read on flow steps" ON public.onboarding_flow_steps;

-- 2. Drop duplicate/weak policies on analytics events
DROP POLICY IF EXISTS "Allow authenticated users to insert events" ON public.onboarding_analytics_events;
DROP POLICY IF EXISTS "Allow users to read their own events" ON public.onboarding_analytics_events;

-- Analytics events are INSERT-only for users (via "Allow authenticated users to insert their own analytics events")
-- SELECT is admin-only (via "Allow admin users to read analytics")

-- 3. Drop duplicate indexes (we already have idx_analytics_*)
DROP INDEX IF EXISTS public.idx_onboarding_events_user_id;
DROP INDEX IF EXISTS public.idx_onboarding_events_session_id;
DROP INDEX IF EXISTS public.idx_onboarding_events_event_name;
DROP INDEX IF EXISTS public.idx_onboarding_events_created_at;

-- Existing proper policies remain:
-- - "Authenticated users can read steps of accessible flows" (flow-scoped, ACTIVE/EXPERIMENT only)
-- - "Allow admin users to read all flow steps" (admin-only)
-- - "Allow authenticated users to insert their own analytics events" (proper role)
-- - "Allow admin users to read analytics" (admin-only analytics access)
