-- Fix profiles table security issues
-- 1. Drop existing insecure RLS policies
DROP POLICY IF EXISTS "Allow delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow update profiles" ON public.profiles;

-- 2. Convert user_id from TEXT to UUID and add foreign key
ALTER TABLE public.profiles 
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid,
  ADD CONSTRAINT profiles_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) 
    ON DELETE CASCADE;

-- 3. Create secure RLS policies that check auth.uid()
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON public.profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);