import { corsHeaders } from '../_shared/cors.ts';

// Input validation helpers
function validateString(input: unknown, maxLength: number): string | null {
  if (input === undefined || input === null) return null;
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > maxLength) return trimmed.slice(0, maxLength);
  return trimmed;
}

function validateNumber(input: unknown): number | undefined {
  if (input === undefined || input === null) return undefined;
  const num = typeof input === 'number' ? input : parseFloat(String(input));
  if (isNaN(num) || !isFinite(num)) return undefined;
  return num;
}

function isValidZipCode(input: string): boolean {
  return /^\d{5}(-\d{4})?$/.test(input);
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    
    // Validate and sanitize inputs
    const address = validateString(body?.address, 500);
    const zipCode = validateString(body?.zipCode, 20);
    const lat = validateNumber(body?.lat);
    const lng = validateNumber(body?.lng);
    
    // Support reverse geocoding (lat/lng → city name)
    if (lat !== undefined && lng !== undefined) {
      const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
      if (!apiKey) {
        console.error('GOOGLE_MAPS_API_KEY not configured');
        return new Response(
          JSON.stringify({ error: 'Geocoding service not configured. Please contact support.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`=== REVERSE GEOCODING ===`);
      console.log(`Coordinates: ${lat}, ${lng}`);

      const reverseGeocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
      const response = await fetch(reverseGeocodeUrl);
      
      if (!response.ok) {
        console.error('Google API request failed:', response.status, response.statusText);
        return new Response(
          JSON.stringify({ error: 'Geocoding service temporarily unavailable. Please try again.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      
      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        console.error('Reverse geocoding failed:', data.status, data.error_message);
        return new Response(
          JSON.stringify({ error: 'Unable to determine city name from coordinates.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const firstResult = data?.results?.[0];
      if (!firstResult) {
        console.error('No results in geocoding response');
        return new Response(
          JSON.stringify({ error: 'Unable to determine city name from coordinates.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const cityName = firstResult.address_components?.find(
        (component: any) => component.types?.includes('locality')
      )?.long_name || firstResult.address_components?.find(
        (component: any) => component.types?.includes('postal_town')
      )?.long_name || 'Unknown';

      console.log(`Successfully reverse geocoded to: ${cityName}`);

      return new Response(
        JSON.stringify({
          lat,
          lng,
          city: cityName
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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
    
    // If this looks like a ZIP code, validate format
    const isZipCodeInput = /^\d/.test(locationStr);
    if (isZipCodeInput && !isValidZipCode(locationStr.split(',')[0].trim())) {
      return new Response(
        JSON.stringify({ error: 'Invalid ZIP code format. Please use 5-digit or 9-digit format.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
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

    // Debug logging for multi-location detection
    console.log(`=== GEOCODING DEBUG ===`);
    console.log(`Input: "${locationStr}"`);
    console.log(`Processing: "${firstLocation}" (extracted from input)`);
    if (locationStr.includes(',')) {
      console.log(`⚠️ Multiple locations detected in input, using first one: "${firstLocation}"`);
    }

    // Call Google Maps Geocoding API (handles any address format)
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(firstLocation)}&components=country:US&key=${apiKey}`;
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

    const firstResult = data?.results?.[0];
    if (!firstResult) {
      console.error('No results in geocoding response');
      return new Response(
        JSON.stringify({ error: 'Unable to geocode location. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const location = firstResult.geometry?.location;
    if (!location) {
      console.error('No geometry in geocoding result');
      return new Response(
        JSON.stringify({ error: 'Invalid geocoding result. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const cityName = firstResult.address_components?.find(
      (component: any) => component.types?.includes('locality')
    )?.long_name || firstResult.address_components?.find(
      (component: any) => component.types?.includes('postal_town')
    )?.long_name || 'Unknown';

    console.log(`Successfully geocoded "${firstLocation}" to:`, location, cityName);
    
    // Verify the result is actually in the target city if a city name was provided
    // (not a ZIP code, which is numeric)
    const isZipCode = /^\d+$/.test(firstLocation.trim());
    if (!isZipCode && cityName.toLowerCase() !== firstLocation.toLowerCase()) {
      console.log(`⚠️ Warning: Requested city "${firstLocation}" but geocoded to "${cityName}"`);
      // Still return the result but log the discrepancy for awareness
    }

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
