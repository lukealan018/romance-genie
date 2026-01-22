import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

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
    
    const { placeId, source } = await req.json();
    console.log('Received placeId:', placeId, 'source:', source);

    if (!placeId) {
      console.error('Missing placeId parameter');
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: placeId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle Ticketmaster event details
    if (source === 'ticketmaster' || placeId.startsWith('tm_')) {
      const TICKETMASTER_API_KEY = Deno.env.get('TICKETMASTER_API_KEY');
      
      if (!TICKETMASTER_API_KEY) {
        console.error('TICKETMASTER_API_KEY is not configured');
        throw new Error('TICKETMASTER_API_KEY is not configured');
      }

      // Strip the tm_ prefix to get the actual event ID
      const eventId = placeId.replace('tm_', '');
      console.log('Fetching Ticketmaster event details for:', eventId);

      const tmUrl = `https://app.ticketmaster.com/discovery/v2/events/${eventId}.json?apikey=${TICKETMASTER_API_KEY}`;
      const response = await fetch(tmUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Ticketmaster API error ${response.status}: ${errorText}`);
        throw new Error(`Ticketmaster API error: ${response.status}`);
      }

      const event = await response.json();
      const venue = event._embedded?.venues?.[0];
      
      // Build address from venue data
      const addressParts: string[] = [];
      if (venue?.address?.line1) addressParts.push(venue.address.line1);
      if (venue?.city?.name) addressParts.push(venue.city.name);
      if (venue?.state?.stateCode) addressParts.push(venue.state.stateCode);
      if (venue?.postalCode) addressParts.push(venue.postalCode);
      const address = addressParts.join(', ') || venue?.name || 'Address unavailable';
      
      // Format price range
      const priceRange = event.priceRanges?.[0];
      const priceDisplay = priceRange 
        ? `$${priceRange.min?.toFixed(0) || '?'} - $${priceRange.max?.toFixed(0) || '?'}`
        : '';
      
      // Get photos - select highest quality images
      const photos = event.images?.slice(0, 5).map((img: any) => ({
        url: img.url,
        width: img.width || 800,
        height: img.height || 600,
      })) || [];

      // Format event date/time for display
      const eventDate = event.dates?.start?.localDate;
      const eventTime = event.dates?.start?.localTime;
      
      const details = {
        name: event.name,
        address,
        phoneNumber: null, // Events don't have phone numbers
        website: event.url, // Ticket purchase URL
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue?.name + ' ' + address)}`,
        rating: 0,
        totalRatings: 0,
        priceLevel: priceDisplay,
        hours: [], // Events don't have hours
        isOpen: null,
        lat: venue?.location?.latitude ? parseFloat(venue.location.latitude) : 0,
        lng: venue?.location?.longitude ? parseFloat(venue.location.longitude) : 0,
        photos,
        // Ticketmaster-specific fields
        ticketUrl: event.url,
        eventDate,
        eventTime,
        venueName: venue?.name,
        isEvent: true,
      };

      console.log('Returning Ticketmaster event details:', event.name);
      return new Response(
        JSON.stringify(details),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle Foursquare place details
    if (source === 'foursquare') {
      const FOURSQUARE_API_KEY = Deno.env.get('FOURSQUARE_API_KEY')?.trim();
      
      if (!FOURSQUARE_API_KEY) {
        console.error('FOURSQUARE_API_KEY is not configured');
        throw new Error('FOURSQUARE_API_KEY is not configured');
      }

      // Try with photos first (premium field)
      let fsUrl = new URL(`https://places-api.foursquare.com/places/${placeId}`);
      fsUrl.searchParams.set('fields', 'name,location,tel,website,rating,stats,hours,price,geocodes,photos');
      console.log('Fetching Foursquare place details with photos:', fsUrl.toString());

      let response = await fetch(fsUrl.toString(), {
        headers: {
          'Authorization': `Bearer ${FOURSQUARE_API_KEY}`,
          'X-Places-Api-Version': '2025-06-17',
          'Accept': 'application/json',
        },
      });

      // If 429 (premium credits exhausted), retry WITHOUT photos field to stay in free tier
      if (response.status === 429) {
        console.log('⚠️ Foursquare premium credits exhausted (photos), retrying without photos field...');
        fsUrl = new URL(`https://places-api.foursquare.com/places/${placeId}`);
        fsUrl.searchParams.set('fields', 'name,location,tel,website,rating,stats,hours,price,geocodes');
        
        response = await fetch(fsUrl.toString(), {
          headers: {
            'Authorization': `Bearer ${FOURSQUARE_API_KEY}`,
            'X-Places-Api-Version': '2025-06-17',
            'Accept': 'application/json',
          },
        });
      }

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`❌ Foursquare Place Details API error: ${response.status} ${response.statusText}`);
        console.error(`❌ Error body: ${errorBody}`);
        throw new Error(`Foursquare API error: ${response.status}`);
      }

      const place = await response.json();
      console.log('Foursquare place details received, photos count:', place.photos?.length || 0);
      if (place.photos?.[0]) {
        console.log('Foursquare photo sample:', JSON.stringify(place.photos[0]));
      }

      // Transform Foursquare response to match expected format
      const details = {
        name: place.name,
        address: place.location?.formatted_address || place.location?.address || '',
        phoneNumber: place.tel || null,
        website: place.website || null,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + (place.location?.address || ''))}`,
        rating: place.rating ? (place.rating / 10) * 5 : 0, // Convert from 10-point to 5-point scale
        totalRatings: place.stats?.total_ratings || 0,
        priceLevel: place.price ? '$'.repeat(place.price) : '',
        hours: place.hours?.display ? [place.hours.display] : [],
        isOpen: place.hours?.open_now ?? null,
        lat: place.latitude || place.geocodes?.main?.latitude || 0,
        lng: place.longitude || place.geocodes?.main?.longitude || 0,
        photos: place.photos?.slice(0, 5).map((photo: any) => ({
          url: photo.prefix + '800x800' + photo.suffix,
          width: 800,
          height: 800,
        })) || [],
      };

      console.log('Returning Foursquare details');
      return new Response(
        JSON.stringify(details),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: Handle Google Place Details
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('GOOGLE_MAPS_API_KEY is not configured');
      throw new Error('GOOGLE_MAPS_API_KEY is not configured');
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
    
    // Process photos - use proxy function to serve images with proper headers
    const photos = place.photos?.slice(0, 5).map((photo: any) => {
      const proxyUrl = `${SUPABASE_URL}/functions/v1/proxy-photo?reference=${photo.photo_reference}&maxwidth=800`;
      console.log('Generated proxy URL:', proxyUrl);
      return {
        url: proxyUrl,
        width: photo.width,
        height: photo.height,
      };
    }) || [];
    
    console.log('Total photos:', photos.length);
    
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
