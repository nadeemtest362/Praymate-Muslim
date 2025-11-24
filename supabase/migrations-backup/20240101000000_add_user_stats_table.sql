-- Add a user_stats table to track prayer streaks and other achievement metrics
CREATE TABLE IF NOT EXISTS public.user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    total_prayers_completed INTEGER NOT NULL DEFAULT 0,
    week_prayers_completed INTEGER NOT NULL DEFAULT 0,
    month_prayers_completed INTEGER NOT NULL DEFAULT 0,
    last_prayer_date TIMESTAMP WITH TIME ZONE,
    streak_start_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    CONSTRAINT user_stats_user_id_key UNIQUE (user_id)
);

-- Add RLS policies
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Users can read only their own stats
CREATE POLICY user_stats_select_policy
    ON public.user_stats
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can update only their own stats
CREATE POLICY user_stats_update_policy
    ON public.user_stats
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Function to update a user's streak when they complete a prayer
CREATE OR REPLACE FUNCTION public.update_prayer_streak()
RETURNS TRIGGER AS $$
DECLARE
    _completed_at TIMESTAMP WITH TIME ZONE := NEW.completed_at;
    _user_id UUID := NEW.user_id;
    _last_prayer_date TIMESTAMP WITH TIME ZONE;
    _yesterday TIMESTAMP WITH TIME ZONE := (CURRENT_DATE - INTERVAL '1 day')::DATE;
    _today TIMESTAMP WITH TIME ZONE := CURRENT_DATE;
    _stats_record public.user_stats;
BEGIN
    -- If prayer is being marked as completed
    IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
        -- Get or create user stats record
        SELECT * INTO _stats_record FROM public.user_stats WHERE user_id = _user_id;
        
        IF NOT FOUND THEN
            -- Create initial stats record if it doesn't exist
            INSERT INTO public.user_stats (
                user_id, 
                current_streak, 
                longest_streak, 
                total_prayers_completed,
                last_prayer_date,
                streak_start_date
            ) VALUES (
                _user_id, 
                1, 
                1, 
                1,
                _completed_at,
                _completed_at
            );
        ELSE
            -- Get the date of last completed prayer
            _last_prayer_date := _stats_record.last_prayer_date;
            
            -- Update streak logic
            UPDATE public.user_stats
            SET 
                total_prayers_completed = total_prayers_completed + 1,
                week_prayers_completed = CASE 
                    WHEN DATE_TRUNC('week', _completed_at) = DATE_TRUNC('week', CURRENT_DATE) 
                    THEN week_prayers_completed + 1 
                    ELSE 1 
                END,
                month_prayers_completed = CASE 
                    WHEN DATE_TRUNC('month', _completed_at) = DATE_TRUNC('month', CURRENT_DATE) 
                    THEN month_prayers_completed + 1 
                    ELSE 1 
                END,
                last_prayer_date = _completed_at,
                -- Streak logic
                current_streak = CASE
                    -- First prayer ever (no previous streak)
                    WHEN _last_prayer_date IS NULL THEN 1
                    -- Prayer today (already counted in streak)
                    WHEN DATE_TRUNC('day', _last_prayer_date) = DATE_TRUNC('day', _completed_at) THEN current_streak
                    -- Prayer yesterday (continue streak)
                    WHEN DATE_TRUNC('day', _last_prayer_date) = DATE_TRUNC('day', _yesterday) THEN current_streak + 1
                    -- Prayer after a gap (reset streak)
                    ELSE 1
                END,
                -- Update streak start date if streak reset
                streak_start_date = CASE
                    WHEN _last_prayer_date IS NULL OR DATE_TRUNC('day', _last_prayer_date) < DATE_TRUNC('day', _yesterday) THEN _completed_at
                    ELSE streak_start_date
                END,
                -- Update longest streak if current streak exceeds it
                longest_streak = CASE
                    WHEN current_streak + CASE
                        WHEN DATE_TRUNC('day', _last_prayer_date) = DATE_TRUNC('day', _completed_at) THEN 0
                        WHEN DATE_TRUNC('day', _last_prayer_date) = DATE_TRUNC('day', _yesterday) THEN 1
                        ELSE 0
                    END > longest_streak THEN
                        current_streak + CASE
                            WHEN DATE_TRUNC('day', _last_prayer_date) = DATE_TRUNC('day', _completed_at) THEN 0
                            WHEN DATE_TRUNC('day', _last_prayer_date) = DATE_TRUNC('day', _yesterday) THEN 1
                            ELSE 0
                        END
                    ELSE longest_streak
                END,
                updated_at = now()
            WHERE user_id = _user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update streak when prayer is completed
DROP TRIGGER IF EXISTS update_prayer_streak_trigger ON public.prayers;
CREATE TRIGGER update_prayer_streak_trigger
AFTER UPDATE OF completed_at ON public.prayers
FOR EACH ROW
WHEN (OLD.completed_at IS NULL AND NEW.completed_at IS NOT NULL)
EXECUTE FUNCTION public.update_prayer_streak();

-- Create index for faster stats lookups
CREATE INDEX IF NOT EXISTS user_stats_user_id_idx ON public.user_stats (user_id);

-- Comment on table and columns
COMMENT ON TABLE public.user_stats IS 'Tracks prayer streaks and achievement statistics for users';
COMMENT ON COLUMN public.user_stats.current_streak IS 'Number of consecutive days with completed prayers';
COMMENT ON COLUMN public.user_stats.longest_streak IS 'Longest streak of consecutive days with completed prayers';
COMMENT ON COLUMN public.user_stats.total_prayers_completed IS 'Total number of prayers completed by the user';
COMMENT ON COLUMN public.user_stats.last_prayer_date IS 'Timestamp of the most recently completed prayer';
COMMENT ON COLUMN public.user_stats.streak_start_date IS 'Date when the current streak started'; 