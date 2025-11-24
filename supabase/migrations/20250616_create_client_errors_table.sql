-- Create client_errors table for logging production errors
CREATE TABLE IF NOT EXISTS public.client_errors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  error_message TEXT NOT NULL,
  error_info TEXT,
  screen TEXT,
  error_type TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to insert errors
CREATE POLICY "Service role can insert errors" ON public.client_errors
  FOR INSERT
  USING (true)
  WITH CHECK (true);

-- Create policy to allow users to view their own errors (for debugging)
CREATE POLICY "Users can view own errors" ON public.client_errors
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
  ));

-- Create index for performance
CREATE INDEX idx_client_errors_user_id ON public.client_errors(user_id);
CREATE INDEX idx_client_errors_timestamp ON public.client_errors(timestamp);
CREATE INDEX idx_client_errors_error_type ON public.client_errors(error_type); 