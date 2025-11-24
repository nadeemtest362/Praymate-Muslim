# Viral Video Database Schema Report

## Overview
This report documents the database schema for the Viral Video Supabase database (molydcrzwsoeyqkiofwe) to help integrate the workflows table with existing tables.

## Actual Database Schema (Discovered)

### Existing Tables Found

#### Workflow/Task Related Tables:
- **gtm_workflows** - Already exists! Structure:
  - `id` (uuid, PK)
  - `task_id` (uuid, nullable) - Links to gtm_tasks
  - `name` (text)
  - `steps` (jsonb) - Workflow steps stored as JSON
  - `status` (text, default: 'draft')
  - `created_at` (timestamp)
  - `updated_at` (timestamp)

- **gtm_tasks** - Task management
  - `id` (uuid, PK)
  - `project_id` (uuid) - Links to gtm_projects
  - `title` (text)
  - Other task-related fields

- **gtm_subtasks** - Subtasks for main tasks
- **gtm_projects** - Project organization
  - `id` (uuid, PK)
  - `name` (text)

#### Agent/Automation Tables:
- **gtm_agents** - AI agents for task automation
- **gtm_agent_tasks** - Agent-task assignments
- **gtm_agent_thoughts** - Agent activity logs

#### Content/Media Tables:
- **videos** - Main video content
  - `id` (integer, PK)
  - `title` (text)
  
- **video_assets** - Video file storage
- **video_scripts** - Generated scripts
- **video_hashtags** - Hashtag associations
- **video_stats_snapshots** - Analytics snapshots
- **saved_videos** - User saved videos
- **explore_feed_videos** - Feed curation

#### Generated Content Tables:
- **gtm_image_assets** - AI-generated images
- **gtm_video_assets** - AI-generated videos
- **gtm_content_references** - Content reference tracking
- **generation_jobs** - Content generation job queue

#### User Tables:
- **authors** - Content creators (no standard users table found)

### Key Findings

1. **gtm_workflows already exists** with a JSON-based step storage approach
2. No separate workflow_steps table - steps are stored in JSONB column
3. Strong GTM (Go-To-Market) focus in the schema
4. No standard users table - uses 'authors' instead
5. Heavy focus on video content and analytics

## Workflow Table Integration Analysis

### Current gtm_workflows Structure
The existing table uses:
- JSON storage for workflow steps (flexible but less queryable)
- Links to gtm_tasks (workflow can be associated with a task)
- Simple status tracking (draft, etc.)

### Recommended Enhancements

#### 1. New Tables to Create:
```sql
-- Workflow executions/runs
CREATE TABLE workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES gtm_workflows(id),
  status TEXT DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error TEXT,
  output JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow templates for reusability
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL,
  category TEXT,
  is_public BOOLEAN DEFAULT false,
  created_by UUID, -- Would need auth integration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow outputs linking to generated content
CREATE TABLE workflow_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id UUID REFERENCES workflow_runs(id),
  output_type TEXT NOT NULL, -- 'image', 'video', 'text'
  output_id UUID, -- References gtm_image_assets.id or gtm_video_assets.id
  output_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. Enhance Existing gtm_workflows:
```sql
ALTER TABLE gtm_workflows
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES workflow_templates(id),
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES gtm_projects(id),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
```

#### 3. Create Indexes:
```sql
CREATE INDEX idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_status ON workflow_runs(status);
CREATE INDEX idx_workflow_outputs_run_id ON workflow_outputs(workflow_run_id);
CREATE INDEX idx_gtm_workflows_project_id ON gtm_workflows(project_id);
```

## Integration Points

### 1. With GTM System:
- Link workflows to gtm_projects for organization
- Associate workflows with gtm_tasks for automation
- Use gtm_agents for workflow execution

### 2. With Content Generation:
- Create workflow_outputs entries for gtm_image_assets
- Create workflow_outputs entries for gtm_video_assets
- Track generation_jobs initiated by workflows

### 3. With Analytics:
- Link workflow performance to video performance
- Track which workflows produce viral content

## Next Steps

1. **Decide on approach**:
   - Option A: Work with existing gtm_workflows structure
   - Option B: Create new workflows table with better structure
   - Option C: Enhance existing table with migrations

2. **Add missing relationships**:
   - Add project_id to gtm_workflows for better organization
   - Create workflow_runs table for execution tracking
   - Add proper foreign keys and indexes

3. **Implement workflow execution**:
   - Create service to execute workflow steps
   - Integrate with existing gtm_agents system
   - Track outputs in dedicated table

4. **Add RLS policies** if Row Level Security is needed

5. **Create TypeScript types** matching the schema