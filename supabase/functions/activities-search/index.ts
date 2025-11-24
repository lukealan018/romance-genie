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

// Category-specific allowlists and exclusions for comprehensive filtering
const venueFilters: Record<string, { allowlist: string[]; excludeTypes: string[]; excludeKeywords: string[] }> = {
  brewery: {
    allowlist: ['brewpub', 'craft brewery', 'microbrewery', 'taproom', 'beer garden', 'brewing company', 'brewery'],
    excludeTypes: ['liquor_store', 'convenience_store', 'supermarket', 'shopping_mall', 'department_store'],
    excludeKeywords: ['beer store', 'total wine', 'bevmo', 'liquor store', 'bottle shop', 'beverage store']
  },
  
  wine: {
    allowlist: ['winery', 'vineyard', 'wine cellar', 'tasting room', 'wine tasting', 'estate winery', 'wine cave', 'wine estate', 'cellar door'],
    excludeTypes: ['liquor_store', 'convenience_store', 'supermarket', 'shopping_mall', 'department_store', 'beauty_salon', 'hair_care', 'spa', 'nail_salon', 'barber_shop'],
    excludeKeywords: ['total wine', 'bevmo', 'liquor store', 'bottle shop', 'spirits store', '& more', 'wine + spirits']
  },
  
  art: {
    allowlist: ['art gallery', 'contemporary gallery', 'fine art gallery', 'sculpture garden', 'exhibition space', 'art museum', 'gallery', 'art center'],
    excludeTypes: ['furniture_store', 'home_goods_store', 'store', 'shopping_mall', 'department_store'],
    excludeKeywords: ['furniture', 'home goods', 'art supplies', 'michaels', 'hobby lobby', 'craft store', 'art supply']
  },
  
  golf: {
    allowlist: ['golf course', 'driving range', 'top golf', 'topgolf', 'mini golf', 'putt-putt', 'miniature golf', 'golf club', 'golf center'],
    excludeTypes: ['sporting_goods_store', 'store', 'shopping_mall', 'department_store'],
    excludeKeywords: ['golf shop', 'golf store', 'sporting goods', "dick's sporting", 'golf galaxy', 'pga superstore']
  },
  
  painting: {
    allowlist: ['paint and sip', 'painting class', 'art studio', 'wine and paint', 'sip and paint', 'paint night', "painting with a twist", "pinot's palette", 'canvas and cocktails', 'paint bar'],
    excludeTypes: ['store', 'craft_store', 'home_goods_store', 'shopping_mall'],
    excludeKeywords: ['michaels', 'hobby lobby', 'art supplies', 'craft store', 'art supply', 'paint store']
  },
  
  hookah: {
    allowlist: ['hookah lounge', 'shisha lounge', 'hookah bar', 'shisha bar', 'hookah cafe', 'hookah spot'],
    excludeTypes: ['store', 'shopping_mall', 'convenience_store'],
    excludeKeywords: ['smoke shop', 'tobacco shop', 'vape shop', 'tobacco store', 'head shop']
  },
  
  theater: {
    allowlist: ['live theater', 'playhouse', 'performing arts', 'repertory', 'stage theater', 'broadway', 'community theater', 'theater company', 'theatre'],
    excludeTypes: ['movie_theater'],
    excludeKeywords: ['cinema', 'movie theater', 'amc', 'regal', 'cinemark', 'movies', 'imax']
  },
  
  comedy: {
    allowlist: ['comedy club', 'comedy theater', 'improv', 'stand-up comedy', 'laugh factory', 'comedy store', 'improv comedy'],
    excludeTypes: [],
    excludeKeywords: []
  }
};

function shouldExcludeResult(placeTypes: string[], searchKeyword: string, placeName: string = ''): boolean {
  const keyword = searchKeyword.toLowerCase();
  const name = placeName.toLowerCase();
  
  // Determine which category filter to apply based on search keyword
  let categoryFilter = null;
  
  if (keyword.includes('brewery') || keyword.includes('brewpub') || keyword.includes('beer')) {
    categoryFilter = venueFilters.brewery;
  } else if (keyword.includes('wine') || keyword.includes('bar') || keyword.includes('lounge') || keyword.includes('cocktail')) {
    categoryFilter = venueFilters.wine;
  } else if (keyword.includes('art') || keyword.includes('gallery') || keyword.includes('museum')) {
    categoryFilter = venueFilters.art;
  } else if (keyword.includes('golf')) {
    categoryFilter = venueFilters.golf;
  } else if (keyword.includes('paint') || keyword.includes('painting')) {
    categoryFilter = venueFilters.painting;
  } else if (keyword.includes('hookah') || keyword.includes('shisha')) {
    categoryFilter = venueFilters.hookah;
  } else if (keyword.includes('theater') || keyword.includes('theatre') || keyword.includes('play') || keyword.includes('musical')) {
    categoryFilter = venueFilters.theater;
  } else if (keyword.includes('comedy')) {
    categoryFilter = venueFilters.comedy;
  }
  
  // If no category filter matches, don't exclude
  if (!categoryFilter) return false;
  
  // PASS 1: Check allowlist - if match found, don't exclude
  if (categoryFilter.allowlist.some(venue => name.includes(venue))) {
    return false;
  }
  
  // PASS 2: Check exclusions
  // Check place types
  if (placeTypes.some(type => categoryFilter.excludeTypes.includes(type))) {
    return true;
  }
  
  // Check name keywords
  if (categoryFilter.excludeKeywords.some(keyword => name.includes(keyword))) {
    return true;
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
      }))
      .filter((item: any) => {
        // Distance validation: filter out results >50 miles from search center
        const R = 3959; // Earth radius in miles
        const dLat = (item.lat - lat) * Math.PI / 180;
        const dLng = (item.lng - lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat * Math.PI / 180) * Math.cos(item.lat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        if (distance > 50) {
          console.log(`❌ Filtering out ${item.name} - ${distance.toFixed(1)} miles from search center`);
          return false;
        }
        return true;
      });

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
