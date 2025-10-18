import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

// Category to keyword mapping
const categoryKeywords: Record<string, string> = {
  'live_music': 'live music',
  'comedy': 'comedy club',
  'movies': 'movie theater',
  'bowling': 'bowling alley',
  'arcade': 'arcade',
  'escape_room': 'escape room',
  'mini_golf': 'mini golf',
  'hike': 'hiking trail',
  'wine': 'wine bar',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY is not configured');
    }

    const { lat, lng, radiusMiles, category, pagetoken } = await req.json();

    if (!lat || !lng || !radiusMiles || !category) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: lat, lng, radiusMiles, category' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const radiusMeters = Math.round(radiusMiles * 1609.34);
    const keyword = categoryKeywords[category] || category;

    console.log('Fetching activities:', {
      lat,
      lng,
      radiusMeters,
      category,
      keyword,
      hasPageToken: !!pagetoken
    });

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
