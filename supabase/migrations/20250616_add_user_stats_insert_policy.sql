-- Add INSERT policy for user_stats table
CREATE POLICY "user_stats_insert_policy" ON public.user_stats
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Also ensure the table exists with proper structure
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_prayers_completed INTEGER DEFAULT 0,
  last_prayer_date TIMESTAMPTZ,
  streak_start_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS if not already enabled
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY; 