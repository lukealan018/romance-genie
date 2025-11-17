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
    console.log('proxy-photo function called');
    
    if (!GOOGLE_MAPS_API_KEY) {
      console.error('GOOGLE_MAPS_API_KEY is not configured');
      throw new Error('GOOGLE_MAPS_API_KEY is not configured');
    }

    const url = new URL(req.url);
    const reference = url.searchParams.get('reference');
    const maxwidth = url.searchParams.get('maxwidth') || '800';

    if (!reference) {
      console.error('Missing reference parameter');
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: reference' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching photo with reference:', reference);

    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${reference}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(photoUrl);
    
    if (!response.ok) {
      console.error('Google Photos API error:', response.status);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch photo from Google' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const imageData = await response.arrayBuffer();

    console.log('Successfully fetched photo, size:', imageData.byteLength, 'bytes');

    // Return the image with proper headers for inline display
    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });

  } catch (error) {
    console.error('Error in proxy-photo function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
