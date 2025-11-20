import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

// Activity types that typically require tickets/advance booking
const eventTypes = new Set([
  'movie_theater',
  'night_club',
  'performing_arts_theater',
  'stadium',
  'concert_hall',
  'casino',
]);

function extractCity(addressComponents: any[]): string | undefined {
  const cityComponent = addressComponents?.find((comp: any) =>
    comp.types.includes('locality') || comp.types.includes('sublocality')
  );
  return cityComponent?.long_name;
}

function determineCategory(types: string[]): 'event' | 'activity' {
  const hasEventType = types?.some(type => eventTypes.has(type));
  return hasEventType ? 'event' : 'activity';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY is not configured');
    }

    const { lat, lng, radiusMiles, keyword, pagetoken } = await req.json();

    if (!lat || !lng || !radiusMiles || !keyword) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: lat, lng, radiusMiles, keyword' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const radiusMeters = Math.round(radiusMiles * 1609.34);

    console.log('=== GOOGLE PLACES REQUEST ===');
    console.log('Keyword:', keyword);
    console.log('Location:', { lat, lng });
    console.log('Radius (meters):', radiusMeters);
    console.log('Has pagetoken:', !!pagetoken);
    console.log('============================');

    // If pagetoken is provided, wait 2 seconds as required by Google Places API
    if (pagetoken) {
      console.log('Waiting 2 seconds before using pagetoken...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.set('location', `${lat},${lng}`);
    url.searchParams.set('radius', radiusMeters.toString());
    url.searchParams.set('keyword', keyword);
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
    
    if (pagetoken) {
      url.searchParams.set('pagetoken', pagetoken);
    }

    const response = await fetch(url.toString());
    const data = await response.json();

    console.log('=== GOOGLE PLACES RESPONSE ===');
    console.log('Results returned:', data.results?.length || 0);
    console.log('Next page available:', !!data.next_page_token);
    console.log('Status:', data.status);
    console.log('==============================');

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data);
      return new Response(
        JSON.stringify({ error: `Google Places API error: ${data.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const items = (data.results || []).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      rating: place.rating || 0,
      totalRatings: place.user_ratings_total || 0,
      address: place.vicinity || place.formatted_address || '',
      lat: place.geometry?.location?.lat || 0,
      lng: place.geometry?.location?.lng || 0,
      city: extractCity(place.address_components),
      category: determineCategory(place.types || []),
    }));

    console.log(`Found ${items.length} activities, nextPageToken: ${!!data.next_page_token}`);

    return new Response(
      JSON.stringify({
        items,
        nextPageToken: data.next_page_token || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in activities-search function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
