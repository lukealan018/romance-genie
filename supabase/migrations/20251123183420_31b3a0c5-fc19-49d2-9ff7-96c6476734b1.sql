-- Add new columns for enhanced profile features
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
ADD COLUMN IF NOT EXISTS voice_notes TEXT,
ADD COLUMN IF NOT EXISTS energy_level TEXT;