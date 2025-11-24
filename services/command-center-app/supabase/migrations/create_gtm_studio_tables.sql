-- GTM Studio Database Schema
-- This schema manages go-to-market tasks, AI agents, and connects to viral video data

-- Projects table (for different GTM campaigns)
CREATE TABLE gtm_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  launch_date DATE,
  status TEXT DEFAULT 'planning', -- planning, active, launched, completed
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GTM Phases
CREATE TABLE gtm_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES gtm_projects(id) ON DELETE CASCADE,
  phase_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  date_range TEXT,
  has_milestone BOOLEAN DEFAULT false,
  color TEXT,
  bg_gradient TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, phase_number)
);

-- GTM Tasks
CREATE TABLE gtm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES gtm_projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES gtm_phases(id) ON DELETE CASCADE,
  task_number TEXT NOT NULL, -- e.g., "0.1", "0.4a"
  title TEXT NOT NULL,
  description TEXT,
  owner TEXT NOT NULL, -- PM, BE, CR, HC
  due_date TEXT, -- e.g., "D-14", "Day 1"
  dependencies TEXT[], -- array of task numbers
  status TEXT DEFAULT 'not-started', -- not-started, in-progress, completed, blocked
  is_milestone BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'medium', -- high, medium, low
  notes TEXT,
  assigned_agent UUID,
  metadata JSONB DEFAULT '{}', -- for custom fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- GTM Subtasks
CREATE TABLE gtm_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES gtm_tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date TEXT,
  status TEXT DEFAULT 'not-started',
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Agents
CREATE TABLE gtm_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- strategist, developer, creative, social
  status TEXT DEFAULT 'idle', -- idle, working, blocked
  specialty TEXT,
  capabilities JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Task Assignments
CREATE TABLE gtm_agent_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES gtm_agents(id) ON DELETE CASCADE,
  task_id UUID REFERENCES gtm_tasks(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'assigned', -- assigned, in-progress, completed, failed
  output JSONB, -- agent's work output
  UNIQUE(agent_id, task_id)
);

-- Agent Thoughts/Logs
CREATE TABLE gtm_agent_thoughts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES gtm_agents(id) ON DELETE CASCADE,
  task_id UUID REFERENCES gtm_tasks(id),
  thought_type TEXT NOT NULL, -- progress, decision, error, insight
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflows
CREATE TABLE gtm_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES gtm_tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  steps JSONB NOT NULL, -- workflow steps definition
  status TEXT DEFAULT 'draft', -- draft, active, paused, completed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Viral Content Reference (linking to your existing viral video data)
CREATE TABLE gtm_content_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES gtm_tasks(id) ON DELETE CASCADE,
  viral_video_id UUID, -- reference to your viral videos table
  usage_type TEXT, -- inspiration, template, competitor, reference
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_gtm_tasks_project_id ON gtm_tasks(project_id);
CREATE INDEX idx_gtm_tasks_phase_id ON gtm_tasks(phase_id);
CREATE INDEX idx_gtm_tasks_status ON gtm_tasks(status);
CREATE INDEX idx_gtm_tasks_owner ON gtm_tasks(owner);
CREATE INDEX idx_gtm_tasks_assigned_agent ON gtm_tasks(assigned_agent);
CREATE INDEX idx_gtm_agent_tasks_agent_id ON gtm_agent_tasks(agent_id);
CREATE INDEX idx_gtm_agent_tasks_task_id ON gtm_agent_tasks(task_id);
CREATE INDEX idx_gtm_agent_thoughts_agent_id ON gtm_agent_thoughts(agent_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gtm_projects_updated_at BEFORE UPDATE ON gtm_projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gtm_phases_updated_at BEFORE UPDATE ON gtm_phases
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gtm_tasks_updated_at BEFORE UPDATE ON gtm_tasks
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gtm_agents_updated_at BEFORE UPDATE ON gtm_agents
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE gtm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE gtm_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE gtm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gtm_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gtm_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE gtm_agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE gtm_agent_thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gtm_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE gtm_content_references ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (you can customize based on your auth setup)
CREATE POLICY "Enable all access for authenticated users" ON gtm_projects
FOR ALL USING (true);

CREATE POLICY "Enable all access for authenticated users" ON gtm_phases
FOR ALL USING (true);

CREATE POLICY "Enable all access for authenticated users" ON gtm_tasks
FOR ALL USING (true);

CREATE POLICY "Enable all access for authenticated users" ON gtm_subtasks
FOR ALL USING (true);

CREATE POLICY "Enable all access for authenticated users" ON gtm_agents
FOR ALL USING (true);

CREATE POLICY "Enable all access for authenticated users" ON gtm_agent_tasks
FOR ALL USING (true);

CREATE POLICY "Enable all access for authenticated users" ON gtm_agent_thoughts
FOR ALL USING (true);

CREATE POLICY "Enable all access for authenticated users" ON gtm_workflows
FOR ALL USING (true);

CREATE POLICY "Enable all access for authenticated users" ON gtm_content_references
FOR ALL USING (true);