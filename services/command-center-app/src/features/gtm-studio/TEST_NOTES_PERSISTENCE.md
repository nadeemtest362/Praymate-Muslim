# Testing Notes Persistence

## Steps to Test

1. **Reset Data** (if needed)

   - Click "Reset Data" button in dev mode
   - This ensures clean state with proper IDs

2. **Add Notes to a Task**

   - Click on any task (e.g., "0.1 Define success metrics")
   - Type some notes in the Notes field
   - Wait for "Notes saved" toast

3. **Check Console Logs**
   You should see:

   ```
   💾 Updating task [UUID]: {
     notes: "Your note text here..."
   }
   ✅ Task updated successfully
   ```

4. **Refresh the Page**

   - Press F5 or Cmd+R
   - Check console for:

   ```
   📄 Tasks with notes: 1
     - Task 0.1: "Your note text here..."
   ```

5. **Open the Same Task**
   - Click on the task again
   - Notes should be there!

## Debugging

If notes don't persist:

1. **Check Task ID**

   - Open browser console
   - When you save notes, look for the task ID in logs
   - Should be a UUID like `abc-123-def`, not `0.1`

2. **Check Database**
   - Look at Supabase dashboard
   - Check `gtm_tasks` table
   - Find the task by `task_number`
   - Verify `notes` column has your text

## Fix Applied

The issue was that the parser was using task numbers (like "0.4") as IDs instead of letting the database generate UUIDs. This caused a mismatch when updating.

Now:

- Parser uses temporary IDs (`temp-0.4`)
- Database assigns real UUIDs
- All updates use the database UUID
- Notes persist correctly!
