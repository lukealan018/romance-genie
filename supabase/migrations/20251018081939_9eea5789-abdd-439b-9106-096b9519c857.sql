-- Update RLS policies for profiles table to work with anonymous users
-- Since we're using anonymous UUID user_ids and validating at the edge function level,
-- we need to allow operations based on the user_id column rather than auth.uid()

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;

-- Create new permissive policies for anonymous users
-- SELECT: Anyone can read any profile (adjust if you need more restriction)
CREATE POLICY "Allow read access to profiles"
ON public.profiles
FOR SELECT
USING (true);

-- INSERT: Allow inserting any profile (edge function validates userId)
CREATE POLICY "Allow insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (true);

-- UPDATE: Allow updating any profile (edge function validates userId)
CREATE POLICY "Allow update profiles"
ON public.profiles
FOR UPDATE
USING (true)
WITH CHECK (true);

-- DELETE: Allow deleting any profile (edge function validates userId)
CREATE POLICY "Allow delete profiles"
ON public.profiles
FOR DELETE
USING (true);