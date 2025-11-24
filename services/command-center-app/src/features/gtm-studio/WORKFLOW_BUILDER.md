# GTM Workflow Builder

## Overview

The Workflow Builder allows you to create automated workflows for GTM tasks. Think of it as "Zapier for your GTM campaign" - automating repetitive tasks and creating smart triggers.

## Features

### 1. Workflow Creation

- Name and describe your workflow
- Select a trigger (what starts the workflow)
- Add multiple actions (what the workflow does)
- Visual workflow builder interface

### 2. Trigger Types

- **Task Status Change**: When a task moves to in-progress or completed
- **All Subtasks Complete**: When all subtasks of a task are done
- **Time Schedule**: Run at specific times (daily, weekly, etc.)
- **Manual Trigger**: Run workflow on demand
- **Milestone Reached**: When a milestone task is completed

### 3. Action Types

- **Generate Video**: Create slideshow or reaction videos
- **Post to Social**: Auto-post to TikTok, Instagram, or YouTube
- **Analyze Metrics**: Check performance and gather insights
- **Notify Team**: Send notifications to team members
- **Update Task**: Change task status or add notes
- **Generate Report**: Create performance reports
- **Schedule Content**: Queue posts for future
- **Crawl Comments**: Collect and analyze social comments

### 4. Workflow Management

- **Active/Paused States**: Control when workflows run
- **Run History**: See when workflows executed
- **Visual Builder**: Drag-and-drop interface
- **Task-Specific**: Create workflows for specific tasks

## How to Use

### Creating a Workflow

1. **From Workflows Tab**:

   - Go to the "Workflows" tab
   - Click "Create Workflow"
   - Fill in details and select trigger
   - Add actions in sequence

2. **From a Task**:
   - Click on any task
   - Click the "Workflow" button
   - Creates a workflow specific to that task

### Example Workflows

#### 1. Auto-Post on Task Completion

- **Trigger**: Task Status Change (to completed)
- **Actions**:
  1. Generate Video
  2. Post to Social
  3. Notify Team

#### 2. Daily Metrics Check

- **Trigger**: Time Schedule (9 AM daily)
- **Actions**:
  1. Analyze Metrics
  2. Generate Report
  3. Update Task notes

#### 3. Milestone Celebration

- **Trigger**: Milestone Reached
- **Actions**:
  1. Notify Team
  2. Generate Report
  3. Post celebration content

### Workflow States

- **Draft**: Being edited, not active
- **Active**: Running and will execute on triggers
- **Paused**: Temporarily disabled

## Technical Implementation

### Data Structure

```typescript
interface Workflow {
  id: string
  name: string
  description?: string
  taskId?: string // Optional task association
  steps: WorkflowStep[]
  status: 'active' | 'paused' | 'draft'
  createdAt: Date
  lastRun?: Date
  runCount: number
}

interface WorkflowStep {
  id: string
  type: 'trigger' | 'action' | 'condition'
  actionId?: string
  triggerId?: string
  config?: Record<string, any>
  nextStepId?: string
}
```

### Database Schema

- `gtm_workflows`: Stores workflow definitions
- `gtm_workflow_logs`: Execution history (future)

## Future Enhancements

1. **Conditional Logic**: If/then branches
2. **Variables**: Pass data between actions
3. **Templates**: Pre-built workflow templates
4. **Webhooks**: External service integration
5. **Error Handling**: Retry logic and notifications
6. **Analytics**: Workflow performance metrics

## Integration Points

The workflow builder integrates with:

- Task management system
- AI agents for content generation
- Social media APIs
- Analytics services
- Notification systems

## Benefits

1. **Automation**: Reduce manual repetitive tasks
2. **Consistency**: Ensure processes are followed
3. **Speed**: Execute complex sequences instantly
4. **Visibility**: Track what's automated
5. **Flexibility**: Customize for your needs
