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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('place-details function called');
    
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('GOOGLE_MAPS_API_KEY is not configured');
      throw new Error('GOOGLE_MAPS_API_KEY is not configured');
    }

    const { placeId } = await req.json();
    console.log('Received placeId:', placeId);

    if (!placeId) {
      console.error('Missing placeId parameter');
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: placeId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    detailsUrl.searchParams.set('place_id', placeId);
    detailsUrl.searchParams.set('fields', 'name,formatted_address,formatted_phone_number,international_phone_number,opening_hours,website,url,rating,user_ratings_total,price_level,geometry,photos');
    detailsUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);

    console.log('Fetching from Google Places API...');

    const response = await fetch(detailsUrl.toString());
    const data = await response.json();

    console.log('Google API response status:', data.status);

    if (data.status !== 'OK') {
      console.error('Google Place Details API error:', data);
      return new Response(
        JSON.stringify({ error: `Google Place Details API error: ${data.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const place = data.result;
    const phoneNumber = place.formatted_phone_number || place.international_phone_number || null;
    
    console.log('Phone number found:', phoneNumber ? 'Yes' : 'No');
    
    // Process photos - get up to 5 photo references
    const photos = place.photos?.slice(0, 5).map((photo: any) => ({
      reference: photo.photo_reference,
      width: photo.width,
      height: photo.height,
    })) || [];
    
    const details = {
      name: place.name,
      address: place.formatted_address,
      phoneNumber: phoneNumber,
      website: place.website || null,
      googleMapsUrl: place.url || null,
      rating: place.rating || 0,
      totalRatings: place.user_ratings_total || 0,
      priceLevel: place.price_level ? '$'.repeat(place.price_level) : '',
      hours: place.opening_hours?.weekday_text || [],
      isOpen: place.opening_hours?.open_now ?? null,
      lat: place.geometry?.location?.lat || 0,
      lng: place.geometry?.location?.lng || 0,
      photos: photos,
    };

    console.log('Returning details with phone:', details.phoneNumber);

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
