-- Create workflow_posts table for storing social media posts created by workflows
CREATE TABLE IF NOT EXISTS workflow_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT NOT NULL,
  task_id UUID REFERENCES gtm_tasks(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, posted, failed
  scheduled_for TIMESTAMP,
  posted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create workflow_reports table for storing generated reports
CREATE TABLE IF NOT EXISTS workflow_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT NOT NULL,
  task_id UUID REFERENCES gtm_tasks(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create workflow_executions table for tracking workflow runs
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id TEXT NOT NULL,
  task_id UUID REFERENCES gtm_tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  results JSONB DEFAULT '{}',
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_workflow_posts_workflow_id ON workflow_posts(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_posts_task_id ON workflow_posts(task_id);
CREATE INDEX IF NOT EXISTS idx_workflow_posts_status ON workflow_posts(status);
CREATE INDEX IF NOT EXISTS idx_workflow_reports_workflow_id ON workflow_reports(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_reports_task_id ON workflow_reports(task_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);

-- Add RLS policies
ALTER TABLE workflow_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (in production, you'd want more restrictive policies)
CREATE POLICY "Enable all access for workflow_posts" ON workflow_posts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for workflow_reports" ON workflow_reports
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all access for workflow_executions" ON workflow_executions
  FOR ALL USING (true) WITH CHECK (true);
EOF < /dev/null