-- Create user_interactions table to track user behavior
CREATE TABLE public.user_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  place_id text NOT NULL,
  place_name text NOT NULL,
  place_type text NOT NULL,
  interaction_type text NOT NULL,
  cuisine text,
  category text,
  rating numeric,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_user_interactions_user_id ON public.user_interactions(user_id);
CREATE INDEX idx_user_interactions_created_at ON public.user_interactions(created_at DESC);

-- Enable RLS
ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_interactions
CREATE POLICY "Users can view own interactions"
  ON public.user_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions"
  ON public.user_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create saved_plans table to store generated plans
CREATE TABLE public.saved_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  restaurant_id text NOT NULL,
  restaurant_name text NOT NULL,
  restaurant_cuisine text,
  activity_id text NOT NULL,
  activity_name text NOT NULL,
  activity_category text,
  search_params jsonb,
  created_at timestamp with time zone DEFAULT now(),
  was_completed boolean DEFAULT false
);

CREATE INDEX idx_saved_plans_user_id ON public.saved_plans(user_id);
CREATE INDEX idx_saved_plans_created_at ON public.saved_plans(created_at DESC);

-- Enable RLS
ALTER TABLE public.saved_plans ENABLE ROW LEVEL SECURITY;

-- RLS policies for saved_plans
CREATE POLICY "Users can view own plans"
  ON public.saved_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own plans"
  ON public.saved_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans"
  ON public.saved_plans FOR UPDATE
  USING (auth.uid() = user_id);