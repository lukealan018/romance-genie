-- Add missing columns to profiles table for ProfileSetup component
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS occasion_type text,
ADD COLUMN IF NOT EXISTS time_preference text;

-- Add comments for documentation
COMMENT ON COLUMN profiles.occasion_type IS 'Type of occasion: date, solo, friends, any';
COMMENT ON COLUMN profiles.time_preference IS 'Preferred time: brunch, golden-hour, evening, late-night';