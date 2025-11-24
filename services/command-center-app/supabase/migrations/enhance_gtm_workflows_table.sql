-- Enhance existing gtm_workflows table with useful columns
ALTER TABLE gtm_workflows 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS run_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_run TIMESTAMPTZ;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gtm_workflows_updated_at ON gtm_workflows(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_gtm_workflows_category ON gtm_workflows(category);
CREATE INDEX IF NOT EXISTS idx_gtm_workflows_status ON gtm_workflows(status);

-- Create workflow runs table to track executions
CREATE TABLE IF NOT EXISTS gtm_workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES gtm_workflows(id) ON DELETE CASCADE,
  task_id UUID REFERENCES gtm_tasks(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  outputs JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for workflow runs
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow_id ON gtm_workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_task_id ON gtm_workflow_runs(task_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON gtm_workflow_runs(status);

-- Enable RLS on workflow runs
ALTER TABLE gtm_workflow_runs ENABLE ROW LEVEL SECURITY;

-- Create policy for anonymous access
CREATE POLICY "Enable all operations for anonymous users" ON gtm_workflow_runs
  FOR ALL USING (true) WITH CHECK (true);