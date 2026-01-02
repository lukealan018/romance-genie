-- Create shared_plans table
CREATE TABLE public.shared_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_plan_id uuid NOT NULL REFERENCES public.scheduled_plans(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  share_context text NOT NULL DEFAULT 'default',
  sender_name text,
  invitee_count int,
  message text,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.shared_plans ENABLE ROW LEVEL SECURITY;

-- Creator can insert/select/delete their own shares
CREATE POLICY "Users can insert own shares" ON public.shared_plans
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
  
CREATE POLICY "Users can view own shares" ON public.shared_plans
  FOR SELECT TO authenticated USING (auth.uid() = created_by);
  
CREATE POLICY "Users can delete own shares" ON public.shared_plans
  FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- Public read for anyone with the share ID (for the recipient view)
CREATE POLICY "Anyone can view share by id" ON public.shared_plans
  FOR SELECT TO anon USING (true);

-- Create share_responses table
CREATE TABLE public.share_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES public.shared_plans(id) ON DELETE CASCADE,
  response text NOT NULL,
  tweak_type text,
  tweak_note text,
  responder_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.share_responses ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) can respond
CREATE POLICY "Anyone can respond to share" ON public.share_responses
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Authenticated can respond to share" ON public.share_responses
  FOR INSERT TO authenticated WITH CHECK (true);

-- Only share creator can view responses (via security definer function to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_share_creator(_share_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shared_plans
    WHERE id = _share_id
      AND created_by = auth.uid()
  )
$$;

CREATE POLICY "Creator can view responses" ON public.share_responses
  FOR SELECT TO authenticated USING (public.is_share_creator(share_id));