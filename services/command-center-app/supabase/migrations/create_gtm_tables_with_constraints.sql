-- Ensure gtm_projects table has proper unique constraint
ALTER TABLE IF EXISTS gtm_projects 
ADD CONSTRAINT IF NOT EXISTS gtm_projects_name_key UNIQUE (name);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gtm_phases_project_id ON gtm_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_gtm_tasks_project_id ON gtm_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_gtm_tasks_phase_id ON gtm_tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_gtm_subtasks_task_id ON gtm_subtasks(task_id);

-- Add constraint to prevent duplicate phase numbers within a project
ALTER TABLE IF EXISTS gtm_phases
ADD CONSTRAINT IF NOT EXISTS gtm_phases_project_phase_unique UNIQUE (project_id, phase_number);

-- Add constraint to prevent duplicate task numbers within a project
ALTER TABLE IF EXISTS gtm_tasks
ADD CONSTRAINT IF NOT EXISTS gtm_tasks_project_task_unique UNIQUE (project_id, task_number);