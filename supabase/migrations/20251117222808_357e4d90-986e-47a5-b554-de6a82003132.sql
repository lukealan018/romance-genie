-- Create user_activity table for tracking user interactions
CREATE TABLE public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  restaurant_id text,
  restaurant_name text,
  restaurant_cuisine text,
  restaurant_price_level text,
  activity_id text,
  activity_name text,
  activity_category text,
  created_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX idx_user_activity_created_at ON public.user_activity(created_at DESC);
CREATE INDEX idx_user_activity_action_type ON public.user_activity(action_type);

-- Enable RLS
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own activity"
  ON public.user_activity FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
  ON public.user_activity FOR INSERT
  WITH CHECK (auth.uid() = user_id);