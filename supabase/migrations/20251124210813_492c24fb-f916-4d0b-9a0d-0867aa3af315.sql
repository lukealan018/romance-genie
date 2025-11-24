-- Add search_mode column to scheduled_plans table
ALTER TABLE scheduled_plans
ADD COLUMN search_mode text CHECK (search_mode IN ('both', 'restaurant_only', 'activity_only'));