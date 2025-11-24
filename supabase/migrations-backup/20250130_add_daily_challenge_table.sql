-- Create table to track daily challenge progress
CREATE TABLE IF NOT EXISTS public.daily_challenge_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_date DATE NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_date)
);

-- Add RLS policies
ALTER TABLE public.daily_challenge_progress ENABLE ROW LEVEL SECURITY;

-- Users can only see their own challenge progress
CREATE POLICY "Users can view own challenge progress" ON public.daily_challenge_progress
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own challenge progress
CREATE POLICY "Users can insert own challenge progress" ON public.daily_challenge_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own challenge progress
CREATE POLICY "Users can update own challenge progress" ON public.daily_challenge_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_daily_challenge_progress_user_date 
ON public.daily_challenge_progress(user_id, challenge_date); 