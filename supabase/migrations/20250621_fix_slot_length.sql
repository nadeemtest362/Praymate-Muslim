-- Fix slot column length to accommodate 'onboarding-initial'
ALTER TABLE openai_prayer_logs 
ALTER COLUMN slot TYPE VARCHAR(50);