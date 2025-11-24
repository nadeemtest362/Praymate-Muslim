-- Current trigger function analysis
-- Let's break down the actual logic that's running

-- From the database query, the current trigger does this:

-- IF _is_perfect_day THEN
--   IF NOT FOUND (no stats record exists) THEN
--     INSERT with current_streak = 1, longest_streak = 1
--   ELSE (stats record exists)
--     UPDATE with streak calculation logic
-- ELSE (not perfect day)
--   UPDATE prayer counts only, don't touch streak
--   IF NOT FOUND THEN 
--     INSERT with current_streak = 0

-- The issue: let's trace what happens step by step for a user
-- 1. User completes first prayer (not perfect day)
-- 2. _is_perfect_day = false
-- 3. Goes to ELSE branch
-- 4. Tries UPDATE but no record exists yet
-- 5. Goes to IF NOT FOUND and creates record with current_streak = 0 ✅

-- 6. User completes second prayer (still not perfect day) 
-- 7. _is_perfect_day = false
-- 8. Goes to ELSE branch  
-- 9. UPDATE succeeds, doesn't touch current_streak ✅

-- So where is current_streak = 1 coming from for non-perfect days?
