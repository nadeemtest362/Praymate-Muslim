-- Create onboarding_sessions table for state persistence
CREATE TABLE IF NOT EXISTS public.onboarding_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  state jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(session_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user_id ON public.onboarding_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_session_id ON public.onboarding_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_updated_at ON public.onboarding_sessions(updated_at DESC);

-- Enable RLS
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own onboarding sessions" 
  ON public.onboarding_sessions FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding sessions" 
  ON public.onboarding_sessions FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding sessions" 
  ON public.onboarding_sessions FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_onboarding_sessions_updated_at 
  BEFORE UPDATE ON public.onboarding_sessions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 