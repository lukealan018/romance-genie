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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Checking for due notifications...');

    // Query notifications that are due to be sent
    const { data: dueNotifications, error: queryError } = await supabase
      .from('notifications')
      .select('*, profiles!inner(notification_quiet_start, notification_quiet_end)')
      .is('sent_at', null)
      .lte('scheduled_for', new Date().toISOString())
      .order('scheduled_for', { ascending: true });

    if (queryError) {
      console.error('Error querying notifications:', queryError);
      return new Response(
        JSON.stringify({ error: 'Failed to query notifications' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!dueNotifications || dueNotifications.length === 0) {
      console.log('No due notifications found');
      return new Response(
        JSON.stringify({ success: true, count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${dueNotifications.length} due notifications`);

    // Filter by quiet hours
    const now = new Date();
    const currentHour = now.getHours();
    
    const notificationsToSend = dueNotifications.filter(notif => {
      const quietStart = parseInt(notif.profiles.notification_quiet_start?.split(':')[0] || '22');
      const quietEnd = parseInt(notif.profiles.notification_quiet_end?.split(':')[0] || '8');
      
      // Check if current hour is NOT in quiet hours
      if (quietStart > quietEnd) {
        // Quiet hours span midnight (e.g., 22:00 to 08:00)
        return currentHour < quietStart && currentHour >= quietEnd;
      } else {
        // Quiet hours don't span midnight
        return currentHour < quietStart || currentHour >= quietEnd;
      }
    });

    console.log(`${notificationsToSend.length} notifications pass quiet hours filter`);

    // Mark notifications as sent
    const notificationIds = notificationsToSend.map(n => n.id);
    
    if (notificationIds.length > 0) {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ sent_at: new Date().toISOString() })
        .in('id', notificationIds);

      if (updateError) {
        console.error('Error marking notifications as sent:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update notifications' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Successfully marked ${notificationIds.length} notifications as sent`);
    }

    // TODO: Add email delivery here if needed (Resend integration)
    // For now, notifications appear in-app via realtime subscription

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: notificationIds.length,
        sent: notificationIds
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-notifications:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
