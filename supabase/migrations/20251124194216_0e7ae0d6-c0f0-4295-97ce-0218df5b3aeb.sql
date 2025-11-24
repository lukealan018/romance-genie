-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_plan_id uuid NOT NULL REFERENCES public.scheduled_plans(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  scheduled_for timestamp with time zone NOT NULL,
  sent_at timestamp with time zone,
  read_at timestamp with time zone,
  delivery_method text DEFAULT 'in_app',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Add notification preferences to profiles
ALTER TABLE public.profiles
  ADD COLUMN notification_email_enabled boolean DEFAULT true,
  ADD COLUMN notification_quiet_start time DEFAULT '22:00',
  ADD COLUMN notification_quiet_end time DEFAULT '08:00';

-- Add completed status to scheduled plans
ALTER TABLE public.scheduled_plans
  ADD COLUMN completed_at timestamp with time zone,
  ADD COLUMN rating integer CHECK (rating >= 1 AND rating <= 5);