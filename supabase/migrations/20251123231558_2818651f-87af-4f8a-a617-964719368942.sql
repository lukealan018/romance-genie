-- Create scheduled_plans table
CREATE TABLE public.scheduled_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Scheduling info
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  
  -- Restaurant details
  restaurant_id TEXT NOT NULL,
  restaurant_name TEXT NOT NULL,
  restaurant_address TEXT,
  restaurant_cuisine TEXT,
  restaurant_lat NUMERIC,
  restaurant_lng NUMERIC,
  restaurant_hours JSONB,
  
  -- Activity details
  activity_id TEXT NOT NULL,
  activity_name TEXT NOT NULL,
  activity_address TEXT,
  activity_category TEXT,
  activity_lat NUMERIC,
  activity_lng NUMERIC,
  activity_hours JSONB,
  
  -- Intelligence data
  weather_forecast JSONB,
  confirmation_numbers JSONB,
  availability_status TEXT DEFAULT 'pending',
  conflict_warnings JSONB,
  
  -- Metadata
  search_params JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'scheduled'
);

-- Enable RLS
ALTER TABLE public.scheduled_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own scheduled plans"
  ON public.scheduled_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scheduled plans"
  ON public.scheduled_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled plans"
  ON public.scheduled_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled plans"
  ON public.scheduled_plans FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_scheduled_plans_updated_at
  BEFORE UPDATE ON public.scheduled_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_updated_at();