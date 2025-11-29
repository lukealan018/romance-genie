import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { FEATURE_FLAGS } from "../_shared/feature-flags.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Provider Status Dashboard Edge Function
 * 
 * Returns the current status of all search providers, booking providers,
 * and feature flags. Useful for:
 * - Investor demonstrations ("flip the switch" dashboard)
 * - Debugging provider configuration
 * - Monitoring provider health
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check for API keys to determine true readiness
    const hasGoogleKey = !!Deno.env.get('GOOGLE_MAPS_API_KEY');
    const hasFoursquareKey = !!Deno.env.get('FOURSQUARE_API_KEY');
    const hasYelpKey = !!Deno.env.get('YELP_API_KEY');
    const hasTicketmasterKey = !!Deno.env.get('TICKETMASTER_API_KEY');
    const hasEventbriteKey = !!Deno.env.get('EVENTBRITE_API_KEY');

    const status = {
      timestamp: new Date().toISOString(),
      
      searchProviders: [
        { 
          name: "google", 
          enabled: FEATURE_FLAGS.ENABLE_GOOGLE && hasGoogleKey, 
          type: "restaurants+activities",
          apiKeyConfigured: hasGoogleKey,
          status: hasGoogleKey ? "active" : "needs_api_key"
        },
        { 
          name: "foursquare", 
          enabled: FEATURE_FLAGS.ENABLE_FOURSQUARE && hasFoursquareKey, 
          type: "restaurants+activities",
          apiKeyConfigured: hasFoursquareKey,
          status: hasFoursquareKey ? "active" : "needs_api_key"
        },
        { 
          name: "yelp", 
          enabled: FEATURE_FLAGS.ENABLE_YELP && hasYelpKey, 
          type: "restaurants+activities",
          apiKeyConfigured: hasYelpKey,
          status: hasYelpKey ? "ready" : "needs_api_key"
        },
        { 
          name: "ticketmaster", 
          enabled: FEATURE_FLAGS.ENABLE_TICKETMASTER && hasTicketmasterKey, 
          type: "activities",
          apiKeyConfigured: hasTicketmasterKey,
          status: hasTicketmasterKey ? "ready" : "needs_api_key"
        },
        { 
          name: "eventbrite", 
          enabled: FEATURE_FLAGS.ENABLE_EVENTBRITE && hasEventbriteKey, 
          type: "activities",
          apiKeyConfigured: hasEventbriteKey,
          status: hasEventbriteKey ? "ready" : "needs_api_key"
        },
      ],
      
      bookingProviders: [
        { 
          name: "opentable", 
          enabled: FEATURE_FLAGS.ENABLE_OPENTABLE, 
          status: "ready",
          integrationMethod: "deep_links"
        },
        { 
          name: "resy", 
          enabled: FEATURE_FLAGS.ENABLE_RESY, 
          status: "ready",
          integrationMethod: "api_partnership_required"
        },
        { 
          name: "yelp-reservations", 
          enabled: FEATURE_FLAGS.ENABLE_YELP_RESERVATIONS, 
          status: hasYelpKey ? "ready" : "needs_api_key",
          integrationMethod: "yelp_fusion_api"
        },
      ],
      
      features: {
        reservationDetection: FEATURE_FLAGS.ENABLE_BOOKING_INSIGHTS ? "active" : "ready",
        smartPrompts: FEATURE_FLAGS.ENABLE_SMART_PROMPTS ? "active" : "ready",
        deepLinks: FEATURE_FLAGS.ENABLE_DEEP_LINKS ? "active" : "ready",
        bookingInsights: FEATURE_FLAGS.ENABLE_BOOKING_INSIGHTS ? "active" : "ready",
      },
      
      summary: {
        activeSearchProviders: [
          FEATURE_FLAGS.ENABLE_GOOGLE && hasGoogleKey ? "google" : null,
          FEATURE_FLAGS.ENABLE_FOURSQUARE && hasFoursquareKey ? "foursquare" : null,
        ].filter(Boolean),
        readyToEnable: [
          !FEATURE_FLAGS.ENABLE_YELP && hasYelpKey ? "yelp" : null,
          !FEATURE_FLAGS.ENABLE_TICKETMASTER && hasTicketmasterKey ? "ticketmaster" : null,
          !FEATURE_FLAGS.ENABLE_EVENTBRITE && hasEventbriteKey ? "eventbrite" : null,
        ].filter(Boolean),
        needsApiKey: [
          !hasYelpKey ? "yelp" : null,
          !hasTicketmasterKey ? "ticketmaster" : null,
          !hasEventbriteKey ? "eventbrite" : null,
        ].filter(Boolean),
      }
    };

    console.log(`📊 Provider status check - Active: ${status.summary.activeSearchProviders.length}, Ready: ${status.summary.readyToEnable.length}`);

    return new Response(
      JSON.stringify(status, null, 2),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in provider-status function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
