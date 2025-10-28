-- Add new columns to profiles table for enhanced preferences
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS price_range text,
ADD COLUMN IF NOT EXISTS dislikes text[],
ADD COLUMN IF NOT EXISTS vibe text,
ADD COLUMN IF NOT EXISTS planning_style text;