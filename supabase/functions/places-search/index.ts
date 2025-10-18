import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY is not configured');
    }

    const url = new URL(req.url);
    const lat = parseFloat(url.searchParams.get('lat') || '');
    const lng = parseFloat(url.searchParams.get('lng') || '');
    const radiusMiles = parseFloat(url.searchParams.get('radiusMiles') || '');
    const cuisine = url.searchParams.get('cuisine') || '';
    const pagetoken = url.searchParams.get('pagetoken');

    // Validate required parameters
    if (isNaN(lat) || isNaN(lng) || isNaN(radiusMiles) || !cuisine) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required parameters: lat, lng, radiusMiles, cuisine' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert miles to meters
    const radiusMeters = Math.round(radiusMiles * 1609.34);

    // If pagetoken is present, wait 2 seconds (Google requirement)
    if (pagetoken) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Build Google Places API request
    const placesUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    placesUrl.searchParams.set('location', `${lat},${lng}`);
    placesUrl.searchParams.set('radius', radiusMeters.toString());
    placesUrl.searchParams.set('keyword', `${cuisine} restaurant`);
    placesUrl.searchParams.set('type', 'restaurant');
    placesUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);
    
    if (pagetoken) {
      placesUrl.searchParams.set('pagetoken', pagetoken);
    }

    console.log('Fetching places:', { lat, lng, radiusMeters, cuisine, hasPageToken: !!pagetoken });

    const response = await fetch(placesUrl.toString());
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data);
      return new Response(
        JSON.stringify({ error: `Google Places API error: ${data.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map response to desired format
    const items = (data.results || []).map((place: any) => ({
      id: place.place_id,
      name: place.name,
      rating: place.rating || 0,
      totalRatings: place.user_ratings_total || 0,
      priceLevel: place.price_level ? '$'.repeat(place.price_level) : '',
      address: place.vicinity || '',
      lat: place.geometry?.location?.lat || 0,
      lng: place.geometry?.location?.lng || 0,
    }));

    console.log(`Found ${items.length} places, nextPageToken: ${!!data.next_page_token}`);

    return new Response(
      JSON.stringify({
        items,
        nextPageToken: data.next_page_token || null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in places-search function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
