-- Add novelty_preference column to profiles table
ALTER TABLE profiles 
ADD COLUMN novelty_preference TEXT 
CHECK (novelty_preference IN ('popular', 'balanced', 'hidden_gems'))
DEFAULT 'balanced';

-- Add index for performance
CREATE INDEX idx_profiles_novelty ON profiles(novelty_preference);