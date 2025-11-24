# Prayer Lab Mood Tracking System

## Overview

The Prayer Lab tracks mood changes across prayer sessions to understand the emotional journey of test users.

## How It Works

### 1. Data Storage

**User Table (`prayer_lab_users`)**

- Stores the **initial mood** when user is created
- Maintains `last_openai_response_id` for conversation continuity
- Mood gets updated after each prayer

**Prayer Table (`prayer_lab_prayers`)**

- Each prayer stores complete mood data in `input_snapshot`:
  ```json
  {
    "mood": "anxious",
    "moodContext": "I'm preparing for a big presentation...",
    "previousMood": "lonely"
  }
  ```
- `modelKnowledge` object tracks what the AI knows:
  ```json
  {
    "modelKnows": {
      "mood": "anxious",
      "moodContext": "...",
      "activeIntentions": [...],
      "cumulativeChanges": [...]
    }
  }
  ```

### 2. Mood Generation Flow

1. **Before each prayer**: New mood is generated based on previous mood
2. **Mood saved to**:
   - User record (current mood)
   - Prayer record (snapshot at prayer time)
3. **Timeline shows**: Mood change events between prayers

### 3. Loading Existing Users

When loading a user with existing prayers:

1. Initial user data loaded from `prayer_lab_users`
2. Previous prayers loaded and converted to timeline
3. **Latest mood restored** from most recent prayer's `modelKnows`
4. This ensures mood continuity across sessions

### 4. Timeline Display

- **Prayer items**: Show the prayer content
- **Mood change events**: Purple-highlighted cards showing:
  - Previous mood → New mood
  - Mood context (why they feel that way)
  - Timestamp of change

## Example Flow

1. User created: mood = "lonely"
2. First prayer generated:
   - New mood: "anxious"
   - Context: "I'm preparing for a big presentation..."
   - Mood change event shows: lonely → anxious
3. Second prayer generated:
   - New mood: "overwhelmed"
   - Context: "I'm trying to balance work with helping elderly parents"
   - Mood change event shows: anxious → overwhelmed

## Key Code Locations

- Mood generation: `generateNewMood()` in `ai-user-generator.ts`
- Mood storage: `savePrayer()` in `supabase-service.ts`
- Mood restoration: `loadTestUser()` in `index.tsx` (lines 256-264)
- Timeline rendering: `timelineItems.map()` in `index.tsx`

## Important Notes

- Mood is **always** regenerated before each prayer (even the first one)
- The OpenAI Responses API maintains conversation state through `previous_response_id`
- Mood context is always in first person ("I feel..." not "They feel...")
- Mood changes are tracked to show emotional progression over time
