import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY is not configured');
    }

    const { placeId } = await req.json();

    if (!placeId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: placeId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    detailsUrl.searchParams.set('place_id', placeId);
    detailsUrl.searchParams.set('fields', 'name,formatted_address,formatted_phone_number,opening_hours,website,url,rating,user_ratings_total,price_level,geometry');
    detailsUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);

    console.log('Fetching place details for:', placeId);

    const response = await fetch(detailsUrl.toString());
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Place Details API error:', data);
      return new Response(
        JSON.stringify({ error: `Google Place Details API error: ${data.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const place = data.result;
    const details = {
      name: place.name,
      address: place.formatted_address,
      phoneNumber: place.formatted_phone_number || null,
      website: place.website || null,
      googleMapsUrl: place.url || null,
      rating: place.rating || 0,
      totalRatings: place.user_ratings_total || 0,
      priceLevel: place.price_level ? '$'.repeat(place.price_level) : '',
      hours: place.opening_hours?.weekday_text || [],
      isOpen: place.opening_hours?.open_now ?? null,
      lat: place.geometry?.location?.lat || 0,
      lng: place.geometry?.location?.lng || 0,
    };

    console.log('Place details fetched successfully');

    return new Response(
      JSON.stringify(details),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in place-details function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
