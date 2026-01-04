-- Fix: Remove overly permissive "Anyone can view share by id" policy
-- The get-share-plan edge function uses service role key which bypasses RLS,
-- so we don't need this dangerous public policy

DROP POLICY IF EXISTS "Anyone can view share by id" ON public.shared_plans;