# GTM Studio

A comprehensive task management and execution dashboard for the TikTok Go-to-Market strategy.

## Features

### 1. GTM File Parser

- Parses the `gtm.MD` file to extract:
  - 5 Phases (0-4) with names, date ranges, and milestones
  - Individual tasks with owner tags (PM, BE, CR, HC)
  - Task dependencies (→ symbols)
  - Subtasks (a, b, c)
  - Decision points and risks (? symbols)
  - Due dates and priorities

### 2. Task Management UI

- **Phase-based View**: Tasks organized by phase with progress tracking
- **Timeline View**: All tasks sorted by due date
- **Owner View**: Tasks grouped by owner/role
- **Today's Focus**: Highlights tasks due today
- **Quick Stats**: Total tasks, due today, overdue, completed

### 3. Interactive Features

- ✅ Mark tasks as complete/in-progress/blocked
- 🤖 Assign tasks to AI agents for automation
- 📝 Add notes and comments to tasks
- 🔍 Search and filter by owner or keywords
- 📊 Visual progress tracking for each phase
- ⚠️ Risk and decision tracking

### 4. Task Details

- Dependencies visualization
- Subtask management
- Priority indicators
- Milestone badges
- Due date tracking

## Usage

1. Navigate to GTM Studio in the sidebar
2. View tasks organized by phase, timeline, or owner
3. Click on any task to see details and take actions
4. Use filters to focus on specific owners or search for tasks
5. Monitor "Today's Focus" for immediate priorities

## File Structure

- `gtm-studio-v3.tsx` - Main UI component
- `services/gtm-file-service.ts` - Hardcoded GTM data and helper functions
- `utils/gtm-parser.ts` - Parser for GTM markdown format
- `types.ts` - TypeScript type definitions

## Task Owner Legend

- **PM**: Growth PM
- **BE**: Backend dev
- **CR**: Creative
- **HC**: Host/Creator
