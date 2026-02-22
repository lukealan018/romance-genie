import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Constants ---
const DINNER_DURATION = 90;   // minutes
const TRAVEL_TIME = 15;       // minutes
const ACTIVITY_DURATION = 90; // minutes
const MINUTES_IN_DAY = 1440;

// --- Helpers ---

/** Parse a Google-style time string like "0830" or "1700" into minutes since midnight. */
function parseTimeToMinutes(time: string): number {
  const t = parseInt(time, 10);
  return Math.floor(t / 100) * 60 + (t % 100);
}

/** Format minutes since midnight into a human-readable string like "7:00 PM". */
function formatTime(mins: number): string {
  const normalized = ((mins % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

interface MatchedPeriod {
  openMinutes: number;
  closeMinutes: number; // may be > 1440 for next-day closing
}

/**
 * Find the period that contains `scheduledMinutes` for a given day.
 * Handles multiple periods per day and next-day closing.
 * Returns the matched period or null. Also returns all periods for the day (for suggestions).
 */
function findMatchingPeriod(
  periods: any[],
  dayOfWeek: number,
  scheduledMinutes: number
): { matched: MatchedPeriod | null; dayPeriods: MatchedPeriod[] } {
  // Filter periods that open on this day
  const dayPeriods: MatchedPeriod[] = periods
    .filter((p: any) => p.open?.day === dayOfWeek)
    .map((p: any) => {
      const openMins = parseTimeToMinutes(p.open.time || '0000');
      let closeMins = p.close ? parseTimeToMinutes(p.close.time || '0000') : openMins + 480; // default 8h if no close
      // Handle next-day closing (e.g. close at 01:00 when open at 18:00)
      if (closeMins <= openMins) {
        closeMins += MINUTES_IN_DAY;
      }
      return { openMinutes: openMins, closeMinutes: closeMins };
    })
    .sort((a, b) => a.openMinutes - b.openMinutes);

  const matched = dayPeriods.find(
    (p) => scheduledMinutes >= p.openMinutes && scheduledMinutes < p.closeMinutes
  ) || null;

  return { matched, dayPeriods };
}

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

    const body = await req.json().catch(() => ({}));
    const { restaurantHours, activityHours, scheduledDate, scheduledTime } = body || {};

    if (!scheduledDate || !scheduledTime) {
      return new Response(
        JSON.stringify({ error: 'Missing scheduledDate or scheduledTime' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;

    // Parse scheduled time
    const timeParts = scheduledTime.split(':');
    const hours = parseInt(timeParts[0] || '0', 10);
    const minutes = parseInt(timeParts[1] || '0', 10);
    const scheduledMinutes = hours * 60 + minutes;

    const conflicts: any[] = [];
    let availabilityStatus = 'available';

    const dayOfWeek = new Date(scheduledDate).getDay();

    // ─── Restaurant validation ───
    if (restaurantHours?.periods) {
      const { matched, dayPeriods } = findMatchingPeriod(
        restaurantHours.periods, dayOfWeek, scheduledMinutes
      );

      if (dayPeriods.length === 0) {
        // No periods for this day at all
        conflicts.push({
          type: 'restaurant_closed',
          message: 'Restaurant is closed on this day.',
          suggestion: 'Choose a different day or restaurant.',
          severity: 'error',
        });
        availabilityStatus = 'closed';
      } else if (!matched) {
        // Day has periods but scheduled time doesn't fall in any
        const periodDescriptions = dayPeriods
          .map((p) => `${formatTime(p.openMinutes)}–${formatTime(p.closeMinutes)}`)
          .join(', ');
        const nearest = dayPeriods.reduce((best, p) =>
          Math.abs(p.openMinutes - scheduledMinutes) < Math.abs(best.openMinutes - scheduledMinutes) ? p : best
        );
        conflicts.push({
          type: 'restaurant_closed',
          message: `Restaurant isn't open at ${formatTime(scheduledMinutes)}. Hours: ${periodDescriptions}.`,
          suggestion: `Try ${formatTime(nearest.openMinutes)} instead?`,
          severity: 'error',
        });
        availabilityStatus = 'closed';
      } else {
        // Matched a period — check if dinner fits before closing
        const dinnerEnd = scheduledMinutes + DINNER_DURATION;
        if (dinnerEnd > matched.closeMinutes) {
          const latestStart = Math.max(matched.openMinutes, matched.closeMinutes - DINNER_DURATION);
          conflicts.push({
            type: 'restaurant_closing',
            message: `Restaurant closes at ${formatTime(matched.closeMinutes)}. Dinner may be rushed.`,
            suggestion: `Try ${formatTime(latestStart)} instead for a relaxed experience?`,
            severity: 'warning',
          });
          availabilityStatus = 'limited';
        }
      }
    }

    // ─── Activity validation ───
    if (activityHours?.periods) {
      const expectedActivityStart = scheduledMinutes + DINNER_DURATION + TRAVEL_TIME;
      const { matched, dayPeriods } = findMatchingPeriod(
        activityHours.periods, dayOfWeek, expectedActivityStart
      );

      if (dayPeriods.length === 0) {
        conflicts.push({
          type: 'activity_closed',
          message: 'Activity appears closed on this day.',
          suggestion: 'Choose a different day or activity.',
          severity: 'warning',
        });
        if (availabilityStatus === 'available') availabilityStatus = 'limited';
      } else if (!matched) {
        // Activity start doesn't fall in any open period
        const nearest = dayPeriods.reduce((best, p) =>
          Math.abs(p.openMinutes - expectedActivityStart) < Math.abs(best.openMinutes - expectedActivityStart) ? p : best
        );
        if (expectedActivityStart < nearest.openMinutes) {
          conflicts.push({
            type: 'activity_timing',
            message: `Activity opens at ${formatTime(nearest.openMinutes)}.`,
            suggestion: 'Consider starting dinner earlier or choosing a later activity time.',
            severity: 'info',
          });
        } else {
          conflicts.push({
            type: 'activity_closed',
            message: `Activity isn't open at ${formatTime(expectedActivityStart)}.`,
            suggestion: `Activity hours end before your estimated arrival.`,
            severity: 'warning',
          });
          if (availabilityStatus === 'available') availabilityStatus = 'limited';
        }
      } else {
        // Check if activity duration fits before closing
        const activityEnd = expectedActivityStart + ACTIVITY_DURATION;
        if (activityEnd > matched.closeMinutes) {
          const idealDinnerStart = matched.closeMinutes - ACTIVITY_DURATION - DINNER_DURATION - TRAVEL_TIME;
          conflicts.push({
            type: 'activity_closing',
            message: `Activity closes at ${formatTime(matched.closeMinutes)}. Your 90-min activity may be cut short.`,
            suggestion: idealDinnerStart >= 0
              ? `Try starting dinner at ${formatTime(idealDinnerStart)} so everything fits.`
              : 'Consider a shorter activity or different venue.',
            severity: 'warning',
          });
          if (availabilityStatus === 'available') availabilityStatus = 'limited';
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
          severity: 'info',
        });
      }
    }

    return new Response(
      JSON.stringify({
        status: availabilityStatus,
        conflicts,
        restaurantHours: restaurantHours?.weekday_text || [],
        activityHours: activityHours?.weekday_text || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-availability:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
