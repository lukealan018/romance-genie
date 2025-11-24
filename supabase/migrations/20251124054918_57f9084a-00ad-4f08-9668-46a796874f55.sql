-- Allow users to delete their own saved plans
CREATE POLICY "Users can delete own plans" 
ON public.saved_plans
FOR DELETE
USING (auth.uid() = user_id);