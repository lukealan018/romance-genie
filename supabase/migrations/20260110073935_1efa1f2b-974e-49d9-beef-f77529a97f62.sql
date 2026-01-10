-- Add UPDATE policy for invites table (hosts can update their own invites)
CREATE POLICY "Users can update own invites" 
ON public.invites 
FOR UPDATE 
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);