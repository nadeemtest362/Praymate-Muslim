-- Create onboarding_flows table
CREATE TABLE IF NOT EXISTS onboarding_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  is_default BOOLEAN DEFAULT false,
  traffic_percentage INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create onboarding_steps table
CREATE TABLE IF NOT EXISTS onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES onboarding_flows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  screen_type TEXT NOT NULL,
  screen_name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  next_step_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_onboarding_flows_status ON onboarding_flows(status);
CREATE INDEX idx_onboarding_flows_is_default ON onboarding_flows(is_default);
CREATE INDEX idx_onboarding_steps_flow_id ON onboarding_steps(flow_id);
CREATE INDEX idx_onboarding_steps_order ON onboarding_steps(flow_id, step_order);

-- Create RLS policies
ALTER TABLE onboarding_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_steps ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read flows and steps
CREATE POLICY "Authenticated users can read flows" ON onboarding_flows
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read steps" ON onboarding_steps
  FOR SELECT TO authenticated USING (true);

-- Only allow service role to modify (for your admin dashboard)
CREATE POLICY "Service role can manage flows" ON onboarding_flows
  FOR ALL TO service_role USING (true);

CREATE POLICY "Service role can manage steps" ON onboarding_steps
  FOR ALL TO service_role USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER update_onboarding_flows_updated_at
  BEFORE UPDATE ON onboarding_flows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_steps_updated_at
  BEFORE UPDATE ON onboarding_steps
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default flow
INSERT INTO onboarding_flows (name, description, status, is_default)
VALUES (
  'Default Onboarding',
  'Standard onboarding flow for new users',
  'active',
  true
) ON CONFLICT DO NOTHING;