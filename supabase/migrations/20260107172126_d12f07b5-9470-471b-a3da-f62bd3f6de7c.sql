-- Create invites table for link-based invitations
CREATE TABLE public.invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  host_name TEXT,
  intent TEXT,
  plan_json JSONB NOT NULL,
  invitee_count INTEGER DEFAULT 1,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + '7 days'::interval),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invite_responses table
CREATE TABLE public.invite_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_id UUID NOT NULL REFERENCES public.invites(id) ON DELETE CASCADE,
  responder_name TEXT,
  response TEXT NOT NULL,
  suggestion_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on invites
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Users can create their own invites
CREATE POLICY "Users can insert own invites"
ON public.invites FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Users can view their own invites
CREATE POLICY "Users can view own invites"
ON public.invites FOR SELECT
USING (auth.uid() = created_by);

-- Users can delete their own invites
CREATE POLICY "Users can delete own invites"
ON public.invites FOR DELETE
USING (auth.uid() = created_by);

-- Enable RLS on invite_responses
ALTER TABLE public.invite_responses ENABLE ROW LEVEL SECURITY;

-- Anyone can respond to an invite (no auth required)
CREATE POLICY "Anyone can respond to invite"
ON public.invite_responses FOR INSERT
WITH CHECK (true);

-- Create function to check if user is invite creator
CREATE OR REPLACE FUNCTION public.is_invite_creator(_invite_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.invites
    WHERE id = _invite_id
      AND created_by = auth.uid()
  )
$$;

-- Invite creator can view responses
CREATE POLICY "Creator can view responses"
ON public.invite_responses FOR SELECT
USING (is_invite_creator(invite_id));