import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

// Venue type mappings
const activityMappings: Record<string, { googleType: string; keywords: string[] }> = {
  'whiskey bar': { googleType: 'bar', keywords: ['whiskey bar', 'whisky bar', 'bourbon bar'] },
  'cocktail bar': { googleType: 'bar', keywords: ['cocktail bar', 'mixology', 'craft cocktails'] },
  'wine bar': { googleType: 'bar', keywords: ['wine bar', 'wine lounge', 'wine tasting room', 'vino bar', 'enoteca'] },
  'speakeasy': { googleType: 'bar', keywords: ['speakeasy', 'hidden bar', 'secret bar'] },
  'lounge bar': { googleType: 'bar', keywords: ['lounge bar', 'cocktail lounge', 'upscale lounge'] },
  'lounge': { googleType: 'bar', keywords: ['lounge', 'cocktail lounge'] },
  'sports bar': { googleType: 'bar', keywords: ['sports bar', 'sports pub'] },
  'dive bar': { googleType: 'bar', keywords: ['dive bar', 'local bar'] },
  'rooftop bar': { googleType: 'bar', keywords: ['rooftop bar', 'rooftop lounge', 'sky bar'] },
  'tiki bar': { googleType: 'bar', keywords: ['tiki bar', 'tropical bar', 'rum bar'] },
  'brewery': { googleType: 'bar', keywords: ['brewery', 'brewpub', 'craft brewery'] },
  'jazz lounge': { googleType: 'bar', keywords: ['jazz lounge', 'jazz bar', 'live jazz'] },
  'hookah lounge': { googleType: 'bar', keywords: ['hookah lounge', 'shisha bar'] },
  'cocktail lounge': { googleType: 'bar', keywords: ['cocktail lounge', 'upscale lounge'] },
  'comedy club': { googleType: 'night_club', keywords: ['comedy club', 'comedy show', 'stand up'] },
  'karaoke': { googleType: 'night_club', keywords: ['karaoke', 'karaoke bar'] },
  'karaoke bar': { googleType: 'night_club', keywords: ['karaoke bar', 'karaoke'] },
  'nightclub': { googleType: 'night_club', keywords: ['nightclub', 'club', 'dance club'] },
  'live music': { googleType: 'night_club', keywords: ['live music', 'music venue', 'concert'] },
  'bowling': { googleType: 'bowling_alley', keywords: ['bowling', 'bowling alley'] },
  'mini golf': { googleType: 'amusement_center', keywords: ['mini golf', 'putt putt'] },
  'golf': { googleType: 'park', keywords: ['golf', 'golf course', 'driving range', 'top golf'] },
  'pool hall': { googleType: 'bar', keywords: ['pool hall', 'billiards', 'pool table'] },
  'axe throwing': { googleType: 'amusement_center', keywords: ['axe throwing', 'hatchet throwing'] },
  'escape room': { googleType: 'amusement_center', keywords: ['escape room', 'escape game'] },
  'arcade': { googleType: 'amusement_center', keywords: ['arcade', 'game room'] },
  'movie theater': { googleType: 'movie_theater', keywords: ['movie theater', 'cinema'] },
  'wine tasting': { googleType: 'bar', keywords: ['wine tasting', 'winery', 'vineyard'] },
  'painting class': { googleType: 'art_gallery', keywords: ['painting class', 'paint night', 'sip and paint'] },
  'paint and sip': { googleType: 'art_gallery', keywords: ['paint and sip', 'wine and paint'] },
  'art gallery': { googleType: 'art_gallery', keywords: ['art gallery', 'gallery'] },
  'museum': { googleType: 'museum', keywords: ['museum', 'exhibit'] },
  'theater': { googleType: 'performing_arts_theater', keywords: ['theater', 'play', 'musical'] },
};

function getActivityMapping(keyword: string): { googleType: string; keywords: string[] } | null {
  const normalized = keyword.toLowerCase().trim();
  return activityMappings[normalized] || null;
}

function shouldExcludeResult(placeTypes: string[], searchKeyword: string, placeName: string = ''): boolean {
  const keyword = searchKeyword.toLowerCase();
  const name = placeName.toLowerCase();
  
  // If searching for bars/wine/cocktails/lounges, exclude retail stores and beauty services
  if (keyword.includes('bar') || keyword.includes('lounge') || 
      keyword.includes('wine') || keyword.includes('cocktail')) {
    
    // Exclude beauty services and retail stores
    const excludeTypes = [
      'beauty_salon', 'hair_care', 'spa', 'nail_salon', 'barber_shop',
      'hair_salon', 'salon', 'beauty', 'cosmetics',
      'liquor_store', 'store', 'convenience_store', 'supermarket',
      'shopping_mall', 'department_store', 'home_goods_store',
    ];
    
    // Check place types first
    if (placeTypes.some(type => excludeTypes.includes(type))) {
      return true;
    }
    
    // Check name for retail indicators
    const retailKeywords = [
      'total wine',
      'bevmo',
      'liquor store',
      'wine shop',
      'wine store',
      'spirits store',
      '& more',
    ];
    
    if (retailKeywords.some(retail => name.includes(retail))) {
      return true;
    }
  }
  
  return false;
}

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

    // Get mapped Google Place type and enhanced keywords
    const mapping = getActivityMapping(keyword);
    const googlePlaceType = mapping?.googleType || null;
    const enhancedKeywords = mapping?.keywords.join(' ') || keyword;

    console.log('=== GOOGLE PLACES REQUEST ===');
    console.log('Keyword:', keyword);
    console.log('Enhanced Keywords:', enhancedKeywords);
    console.log('Google Type:', googlePlaceType);
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
    url.searchParams.set('keyword', enhancedKeywords);
    if (googlePlaceType) {
      url.searchParams.set('type', googlePlaceType);
    }
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

    const items = (data.results || [])
      .filter((place: any) => !shouldExcludeResult(place.types || [], keyword, place.name || ''))
      .map((place: any) => ({
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
