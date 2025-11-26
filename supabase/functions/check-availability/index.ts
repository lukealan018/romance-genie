import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl ?? '', supabaseKey ?? '');

    // Verify JWT and get authenticated user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { restaurantId, activityId, restaurantHours, activityHours, scheduledDate, scheduledTime } = await req.json();

    // Use authenticated user ID instead of trusting request body
    const userId = user.id;

    // Parse scheduled time
    const [hours, minutes] = scheduledTime.split(':').map(Number);
    const scheduledMinutes = hours * 60 + minutes;

    const conflicts = [];
    let availabilityStatus = 'available';

    // Check restaurant hours
    if (restaurantHours?.periods) {
      const dayOfWeek = new Date(scheduledDate).getDay();
      const dayPeriod = restaurantHours.periods.find((p: any) => p.open.day === dayOfWeek);
      
      if (dayPeriod) {
        const closeTime = dayPeriod.close.time;
        const closeHours = Math.floor(parseInt(closeTime) / 100);
        const closeMinutes = parseInt(closeTime) % 100;
        const closingTimeInMinutes = closeHours * 60 + closeMinutes;

        // Assume 90 min dinner duration
        const dinnerEndTime = scheduledMinutes + 90;

        if (dinnerEndTime > closingTimeInMinutes) {
          const suggestedTime = Math.max(scheduledMinutes - 60, closeHours * 60 - 150);
          const suggestedHour = Math.floor(suggestedTime / 60);
          const suggestedMin = suggestedTime % 60;
          
          conflicts.push({
            type: 'restaurant_closing',
            message: `Restaurant closes at ${closeHours}:${closeMinutes.toString().padStart(2, '0')}. Dinner may be rushed.`,
            suggestion: `Try ${suggestedHour}:${suggestedMin.toString().padStart(2, '0')} instead for a relaxed experience?`,
            severity: 'warning'
          });
          availabilityStatus = 'limited';
        }
      } else if (!restaurantHours.open_now) {
        conflicts.push({
          type: 'restaurant_closed',
          message: 'Restaurant is closed on this day.',
          suggestion: 'Choose a different day or restaurant.',
          severity: 'error'
        });
        availabilityStatus = 'closed';
      }
    }

    // Check activity timing
    if (activityHours?.periods) {
      const dayOfWeek = new Date(scheduledDate).getDay();
      const dayPeriod = activityHours.periods.find((p: any) => p.open.day === dayOfWeek);
      
      if (dayPeriod) {
        const openTime = dayPeriod.open.time;
        const openHours = Math.floor(parseInt(openTime) / 100);
        const openMinutes = parseInt(openTime) % 100;
        const openingTimeInMinutes = openHours * 60 + openMinutes;

        // Activity should start after dinner (90min) + travel (15min)
        const expectedActivityStart = scheduledMinutes + 105;

        if (expectedActivityStart < openingTimeInMinutes) {
          conflicts.push({
            type: 'activity_timing',
            message: `Activity opens at ${openHours}:${openMinutes.toString().padStart(2, '0')}.`,
            suggestion: `Consider starting dinner earlier or choosing a later activity time.`,
            severity: 'info'
          });
        }
      }
    }

    // Check for date proximity conflicts with other scheduled plans
    if (userId) {
      const targetDate = new Date(scheduledDate);
      const dayBefore = new Date(targetDate);
      dayBefore.setDate(dayBefore.getDate() - 2);
      const dayAfter = new Date(targetDate);
      dayAfter.setDate(dayAfter.getDate() + 2);

      const { data: nearbyPlans } = await supabase
        .from('scheduled_plans')
        .select('scheduled_date')
        .eq('user_id', userId)
        .gte('scheduled_date', dayBefore.toISOString().split('T')[0])
        .lte('scheduled_date', dayAfter.toISOString().split('T')[0])
        .neq('scheduled_date', scheduledDate);

      if (nearbyPlans && nearbyPlans.length > 0) {
        conflicts.push({
          type: 'date_proximity',
          message: `You have ${nearbyPlans.length} other date(s) scheduled within 2 days of this date.`,
          suggestion: 'Just so you know! No action needed.',
          severity: 'info'
        });
      }
    }

    return new Response(
      JSON.stringify({
        status: availabilityStatus,
        conflicts,
        restaurantHours: restaurantHours?.weekday_text || [],
        activityHours: activityHours?.weekday_text || []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in check-availability:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
