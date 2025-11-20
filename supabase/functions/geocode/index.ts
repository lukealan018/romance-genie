import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, zipCode } = await req.json();
    
    // Support both 'address' and 'zipCode' parameters for backward compatibility
    const locationInput = address || zipCode;
    
    // Validate location input
    if (!locationInput || typeof locationInput !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Address or ZIP code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const locationStr = String(locationInput).trim();
    
    // If multiple locations mentioned (e.g., "Santa Monica, Brentwood"), use the first one
    const firstLocation = locationStr.split(',')[0].trim();
    
    if (!firstLocation) {
      return new Response(
        JSON.stringify({ error: 'Valid address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      console.error('GOOGLE_MAPS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Geocoding service not configured. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Google Maps Geocoding API (handles any address format)
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(firstLocation)}&components=country:US&key=${apiKey}`;
    
    console.log(`Geocoding location: ${firstLocation}`);
    const response = await fetch(geocodeUrl);
    
    if (!response.ok) {
      console.error('Google API request failed:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Geocoding service temporarily unavailable. Please try again.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Google API response:', data.status, data.error_message || 'OK');

    // Handle different Google API status codes
    if (data.status === 'ZERO_RESULTS') {
      return new Response(
        JSON.stringify({ error: `Location "${firstLocation}" not found. Please check and try again.` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (data.status === 'REQUEST_DENIED') {
      console.error('Google API request denied:', data.error_message);
      return new Response(
        JSON.stringify({ error: 'Geocoding service configuration error. Please contact support.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (data.status === 'OVER_QUERY_LIMIT') {
      console.error('Google API quota exceeded');
      return new Response(
        JSON.stringify({ error: 'Service temporarily overloaded. Please try again in a few moments.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.error('Geocoding failed:', data.status, data.error_message);
      return new Response(
        JSON.stringify({ error: 'Unable to geocode ZIP code. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const location = data.results[0].geometry.location;
    const cityName = data.results[0].address_components.find(
      (component: any) => component.types.includes('locality')
    )?.long_name || data.results[0].address_components.find(
      (component: any) => component.types.includes('postal_town')
    )?.long_name || 'Unknown';

    console.log(`Successfully geocoded "${firstLocation}" to:`, location, cityName);

    return new Response(
      JSON.stringify({
        lat: location.lat,
        lng: location.lng,
        city: cityName
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Geocoding error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
