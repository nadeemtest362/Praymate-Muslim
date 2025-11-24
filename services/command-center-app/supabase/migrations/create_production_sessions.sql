-- Create table for production studio sessions
CREATE TABLE IF NOT EXISTS production_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Untitled Session',
  assets JSONB NOT NULL DEFAULT '[]',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived'))
);

-- Create index for faster queries
CREATE INDEX idx_production_sessions_created_at ON production_sessions(created_at DESC);
CREATE INDEX idx_production_sessions_status ON production_sessions(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_production_sessions_updated_at 
  BEFORE UPDATE ON production_sessions 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();