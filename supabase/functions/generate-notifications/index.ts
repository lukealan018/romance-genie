import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // JWT Authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify JWT and get authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    const user = authData?.user;

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { scheduled_plan_id } = await req.json();
    console.log('Generating notifications for plan:', scheduled_plan_id);

    // Fetch the scheduled plan
    const { data: plan, error: planError } = await supabase
      .from('scheduled_plans')
      .select('*')
      .eq('id', scheduled_plan_id)
      .single();

    if (planError || !plan) {
      console.error('Error fetching plan:', planError);
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership
    if (plan.user_id !== user.id) {
      console.error('Unauthorized: User does not own this plan');
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not own this plan' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's quiet hours preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('notification_quiet_start, notification_quiet_end')
      .eq('user_id', plan.user_id)
      .single();

    const quietStart = profile?.notification_quiet_start || '22:00';
    const quietEnd = profile?.notification_quiet_end || '08:00';

    // Parse scheduled date and time
    const scheduledDateTime = new Date(`${plan.scheduled_date}T${plan.scheduled_time}`);
    const notifications = [];

    // Helper to adjust time to respect quiet hours
    const adjustForQuietHours = (date: Date, preferredHour: number): Date => {
      const adjusted = new Date(date);
      const quietStartHour = parseInt(quietStart.split(':')[0]);
      const quietEndHour = parseInt(quietEnd.split(':')[0]);
      
      if (preferredHour >= quietStartHour || preferredHour < quietEndHour) {
        adjusted.setHours(quietEndHour, 0, 0, 0);
      } else {
        adjusted.setHours(preferredHour, 0, 0, 0);
      }
      return adjusted;
    };

    // 1. Two Days Before (if date is >2 days out)
    const twoDaysBefore = new Date(scheduledDateTime);
    twoDaysBefore.setDate(twoDaysBefore.getDate() - 2);
    const now = new Date();
    
    if (twoDaysBefore > now) {
      notifications.push({
        user_id: plan.user_id,
        scheduled_plan_id: plan.id,
        notification_type: 'pre_date_2day',
        title: 'Date Night Coming Up! 🎉',
        message: `Your date is ${scheduledDateTime.toLocaleDateString('en-US', { weekday: 'long' })} at ${plan.scheduled_time}. ${plan.restaurant_name} + ${plan.activity_name}`,
        scheduled_for: adjustForQuietHours(twoDaysBefore, 10),
        delivery_method: 'in_app'
      });
    }

    // 2. Day Of Morning
    const dayOfMorning = new Date(scheduledDateTime);
    notifications.push({
      user_id: plan.user_id,
      scheduled_plan_id: plan.id,
      notification_type: 'day_of_morning',
      title: 'Tonight\'s the Night! 🌟',
      message: `Your date is tonight at ${plan.scheduled_time}. ${plan.restaurant_name} → ${plan.activity_name}`,
      scheduled_for: adjustForQuietHours(dayOfMorning, 8),
      delivery_method: 'in_app'
    });

    // 3. Two Hours Before
    const twoHoursBefore = new Date(scheduledDateTime);
    twoHoursBefore.setHours(twoHoursBefore.getHours() - 2);
    notifications.push({
      user_id: plan.user_id,
      scheduled_plan_id: plan.id,
      notification_type: '2hrs_before',
      title: 'Leaving Soon? 🚗',
      message: `Check traffic to ${plan.restaurant_name}. Dinner at ${plan.scheduled_time}.`,
      scheduled_for: twoHoursBefore,
      delivery_method: 'in_app'
    });

    // 4. Post-Date Follow-Up
    const dayAfter = new Date(scheduledDateTime);
    dayAfter.setDate(dayAfter.getDate() + 1);
    notifications.push({
      user_id: plan.user_id,
      scheduled_plan_id: plan.id,
      notification_type: 'post_date',
      title: 'How Was Your Date? 💕',
      message: 'Tell us how it went! Rate your experience.',
      scheduled_for: adjustForQuietHours(dayAfter, 10),
      delivery_method: 'in_app'
    });

    // 5. Weather Alert (conditional - if bad weather)
    if (plan.weather_forecast?.conditions === 'rain' || plan.weather_forecast?.conditions === 'snow') {
      const oneDayBefore = new Date(scheduledDateTime);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);
      oneDayBefore.setHours(18, 0, 0, 0);
      
      if (oneDayBefore > now) {
        notifications.push({
          user_id: plan.user_id,
          scheduled_plan_id: plan.id,
          notification_type: 'weather_alert',
          title: 'Weather Alert ⛈️',
          message: `${plan.weather_forecast.conditions} expected ${scheduledDateTime.toLocaleDateString('en-US', { weekday: 'long' })} night - ${plan.restaurant_name} and ${plan.activity_name} are indoor-friendly`,
          scheduled_for: oneDayBefore,
          delivery_method: 'in_app'
        });
      }
    }

    // 6. Confirmation Reminder (conditional - if no confirmation numbers)
    if (!plan.confirmation_numbers || Object.keys(plan.confirmation_numbers).length === 0) {
      const oneDayBefore = new Date(scheduledDateTime);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);
      oneDayBefore.setHours(14, 0, 0, 0);
      
      if (oneDayBefore > now) {
        notifications.push({
          user_id: plan.user_id,
          scheduled_plan_id: plan.id,
          notification_type: 'confirmation_reminder',
          title: 'Don\'t Forget! 📝',
          message: 'Add confirmation numbers for better tracking',
          scheduled_for: oneDayBefore,
          delivery_method: 'in_app'
        });
      }
    }

    // Insert all notifications
    const { data: insertedNotifications, error: insertError } = await supabase
      .from('notifications')
      .insert(notifications)
      .select();

    if (insertError) {
      console.error('Error inserting notifications:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create notifications' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully created ${insertedNotifications.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: insertedNotifications.length,
        notifications: insertedNotifications 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
