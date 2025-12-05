-- Add experience_level column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN experience_level text DEFAULT 'any';

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.experience_level IS 'Preferred experience level: any, casual, nice, upscale, luxury';