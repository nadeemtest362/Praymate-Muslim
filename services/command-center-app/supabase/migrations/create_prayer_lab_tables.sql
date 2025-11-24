-- Create separate tables for Prayer Lab testing
-- These are isolated from production data

-- Prayer Lab test users
CREATE TABLE IF NOT EXISTS prayer_lab_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  display_name TEXT,
  mood TEXT,
  mood_context TEXT,
  initial_motivation TEXT,
  relationship_with_god TEXT,
  prayer_frequency TEXT,
  faith_tradition TEXT,
  commitment_level TEXT,
  streak_goal_days INTEGER,
  prayer_times TEXT[],
  prayer_needs TEXT[],
  custom_prayer_need TEXT,
  last_openai_response_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Prayer Lab people (for intercession)
CREATE TABLE IF NOT EXISTS prayer_lab_people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES prayer_lab_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  gender TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Prayer Lab intentions
CREATE TABLE IF NOT EXISTS prayer_lab_intentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES prayer_lab_users(id) ON DELETE CASCADE,
  person_id UUID REFERENCES prayer_lab_people(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  details TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Prayer Lab generated prayers
CREATE TABLE IF NOT EXISTS prayer_lab_prayers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES prayer_lab_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  slot TEXT NOT NULL,
  prompt TEXT,
  openai_response_id TEXT,
  model TEXT DEFAULT 'gpt-4o',
  input_snapshot JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes for performance
CREATE INDEX idx_prayer_lab_users_email ON prayer_lab_users(email);
CREATE INDEX idx_prayer_lab_intentions_user_id ON prayer_lab_intentions(user_id);
CREATE INDEX idx_prayer_lab_prayers_user_id ON prayer_lab_prayers(user_id);
CREATE INDEX idx_prayer_lab_prayers_created_at ON prayer_lab_prayers(created_at DESC);

-- RLS Policies (assuming you want these tables accessible to authenticated users)
ALTER TABLE prayer_lab_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_lab_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_lab_intentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_lab_prayers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage Prayer Lab data
CREATE POLICY "Authenticated users can manage prayer lab users" ON prayer_lab_users
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage prayer lab people" ON prayer_lab_people
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage prayer lab intentions" ON prayer_lab_intentions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage prayer lab prayers" ON prayer_lab_prayers
  FOR ALL USING (auth.role() = 'authenticated');