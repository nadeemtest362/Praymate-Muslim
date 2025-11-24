# GTM Studio Data Flow

## Overview

GTM Studio manages Go-to-Market campaign data for the Personal Prayers TikTok launch. The data is parsed from `gtm.MD` and stored in the viral video Supabase database.

## Data Flow

### 1. Initial Load

```
gtm.MD → Parse → Check DB → Initialize if empty → Load from DB
```

The system follows this logic:

1. **Check for existing project**: Looks for "TikTok GTM" project in `gtm_projects` table
2. **Create project if missing**: Only creates if it doesn't exist (prevents duplicates)
3. **Check for phases**: If no phases exist, parses gtm.MD and initializes the database
4. **Load from database**: Always loads the final data from the database

### 2. Database Schema

```sql
gtm_projects (unique on name)
  ↓
gtm_phases (unique on project_id + phase_number)
  ↓
gtm_tasks (unique on project_id + task_number)
  ↓
gtm_subtasks
```

### 3. Subtask Generation

- Uses Claude Opus 4 via simple Anthropic API integration
- Generates actionable subtasks based on task context
- Auto-saves to database with proper relationships

### 4. Data Reset (Development Only)

- Available via "Reset Data" button in dev mode
- Clears all existing data for the project
- Re-initializes from gtm.MD
- Useful for testing or fixing data issues

## Key Functions

### `loadGTMData()`

- Main entry point for loading GTM data
- Handles initialization on first run
- Returns phases and risks

### `getOrCreateProject()`

- Ensures single project instance
- Uses `maybeSingle()` to avoid 406 errors
- Handles duplicate key errors gracefully

### `resetGTMData()`

- Development tool for data reset
- Cleans up in proper order (subtasks → tasks → phases)
- Re-initializes from source

## Troubleshooting

### "Why are we creating projects?"

The system only creates a project once. If you're seeing repeated creation attempts, check:

1. Database connection issues
2. Unique constraints on `gtm_projects.name`
3. Console logs for detailed flow

### Subtasks not persisting

1. Check if the task has a valid ID
2. Verify the subtask save operation completes
3. Look for errors in the console

### 406 Errors

- Fixed by using `maybeSingle()` instead of `single()`
- Occurs when querying for non-existent data
- Now handled gracefully

## Future Improvements

1. Add version tracking for gtm.MD updates
2. Implement diff-based updates instead of full reset
3. Add audit trail for changes
4. Support multiple GTM campaigns
