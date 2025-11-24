-- Add website columns to scheduled_plans table
ALTER TABLE public.scheduled_plans
ADD COLUMN restaurant_website TEXT,
ADD COLUMN activity_website TEXT;