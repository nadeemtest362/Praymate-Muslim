-- Create praylock_settings table
CREATE TABLE IF NOT EXISTS public.praylock_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false NOT NULL,
    schedule TEXT DEFAULT 'morning' NOT NULL CHECK (schedule IN ('morning', 'evening', 'both')),
    morning_completed BOOLEAN DEFAULT false NOT NULL,
    evening_completed BOOLEAN DEFAULT false NOT NULL,
    blocked_apps JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.praylock_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own praylock settings" ON public.praylock_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own praylock settings" ON public.praylock_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own praylock settings" ON public.praylock_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own praylock settings" ON public.praylock_settings
    FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_praylock_settings_updated_at
    BEFORE UPDATE ON public.praylock_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to reset prayer completion flags
CREATE OR REPLACE FUNCTION reset_praylock_completion_flags()
RETURNS void AS $$
DECLARE
    current_hour INTEGER;
    user_record RECORD;
BEGIN
    -- Loop through all users with praylock enabled
    FOR user_record IN 
        SELECT p.id, p.timezone, ps.schedule
        FROM profiles p
        INNER JOIN praylock_settings ps ON ps.user_id = p.id
        WHERE ps.enabled = true
    LOOP
        -- Get current hour in user's timezone
        current_hour := EXTRACT(HOUR FROM NOW() AT TIME ZONE COALESCE(user_record.timezone, 'America/New_York'));
        
        -- Reset morning flag at 4 AM
        IF current_hour = 4 THEN
            IF user_record.schedule IN ('morning', 'both') THEN
                UPDATE praylock_settings 
                SET morning_completed = false 
                WHERE user_id = user_record.id;
            END IF;
        END IF;
        
        -- Reset evening flag at 4 PM (16:00)
        IF current_hour = 16 THEN
            IF user_record.schedule IN ('evening', 'both') THEN
                UPDATE praylock_settings 
                SET evening_completed = false 
                WHERE user_id = user_record.id;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Note: You'll need to set up a cron job to call reset_praylock_completion_flags() every hour
-- Or use pg_cron if available:
-- SELECT cron.schedule('reset-praylock-flags', '0 * * * *', 'SELECT reset_praylock_completion_flags();');