import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

function extractCity(addressComponents: any[]): string | undefined {
  const cityComponent = addressComponents?.find((comp: any) =>
    comp.types.includes('locality') || comp.types.includes('sublocality')
  );
  return cityComponent?.long_name;
}

// Restaurant filtering to exclude grocery stores, gas stations, and other non-restaurant venues
function shouldExcludeRestaurant(placeTypes: string[], placeName: string = ''): boolean {
  const name = placeName.toLowerCase();
  
  // PASS 1: Allowlist legitimate restaurants
  const restaurantKeywords = [
    'restaurant', 'bistro', 'cafe', 'steakhouse', 'trattoria', 
    'brasserie', 'eatery', 'dining', 'grill', 'kitchen', 
    'pizzeria', 'tavern', 'pub', 'diner', 'bar & grill'
  ];
  
  // If it matches restaurant keywords, don't exclude
  if (restaurantKeywords.some(keyword => name.includes(keyword))) {
    return false;
  }
  
  // PASS 2: Exclude grocery stores, gas stations, convenience stores
  const excludeTypes = [
    'grocery_store', 'supermarket', 'convenience_store', 
    'gas_station', 'shopping_mall', 'department_store'
  ];
  
  if (placeTypes.some(type => excludeTypes.includes(type))) {
    return true;
  }
  
  // Exclude by name keywords
  const excludeKeywords = [
    'whole foods', 'trader joe', '7-eleven', 'chevron', 
    'shell', 'arco', 'grocery', 'market', 'walmart', 
    'target', 'costco', 'safeway', 'ralphs', 'vons'
  ];
  
  if (excludeKeywords.some(keyword => name.includes(keyword))) {
    return true;
  }
  
  return false;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_MAPS_API_KEY) {
      throw new Error('GOOGLE_MAPS_API_KEY is not configured');
    }

    // Parse request body for POST requests
    let lat: number, lng: number, radiusMiles: number, cuisine: string, priceLevel: string | undefined, pagetoken: string | undefined;

    if (req.method === 'POST') {
      const body = await req.json();
      lat = body.lat;
      lng = body.lng;
      radiusMiles = body.radiusMiles;
      cuisine = body.cuisine;
      priceLevel = body.priceLevel;
      pagetoken = body.pagetoken;
    } else {
      // Fallback to query params for GET
      const url = new URL(req.url);
      lat = parseFloat(url.searchParams.get('lat') || '');
      lng = parseFloat(url.searchParams.get('lng') || '');
      radiusMiles = parseFloat(url.searchParams.get('radiusMiles') || '');
      cuisine = url.searchParams.get('cuisine') || '';
      priceLevel = url.searchParams.get('priceLevel') || undefined;
      pagetoken = url.searchParams.get('pagetoken') || undefined;
    }

    // Validate required parameters
    if (isNaN(lat) || isNaN(lng) || isNaN(radiusMiles)) {
      console.error('Invalid parameters:', { lat, lng, radiusMiles, cuisine });
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required parameters: lat, lng, radiusMiles, cuisine' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert miles to meters
    const radiusMeters = Math.round(radiusMiles * 1609.34);

    // Map price level to Google's scale (1-4)
    const priceLevelMap: Record<string, { min: number; max: number }> = {
      'budget': { min: 1, max: 2 },
      'moderate': { min: 2, max: 3 },
      'upscale': { min: 3, max: 4 }
    };
    
    const priceRange = priceLevel ? priceLevelMap[priceLevel] : null;
    
    // Add price descriptors to keyword
    let enhancedKeyword = cuisine === 'restaurant' ? 'restaurant' : `${cuisine} restaurant`;
    if (priceLevel === 'upscale') {
      enhancedKeyword = `upscale ${enhancedKeyword} fine dining`;
    } else if (priceLevel === 'budget') {
      enhancedKeyword = `affordable ${enhancedKeyword}`;
    }

    // If pagetoken is present, wait 2 seconds (Google requirement)
    if (pagetoken) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Build Google Places API request
    const placesUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    placesUrl.searchParams.set('location', `${lat},${lng}`);
    placesUrl.searchParams.set('radius', radiusMeters.toString());
    placesUrl.searchParams.set('keyword', enhancedKeyword);
    placesUrl.searchParams.set('type', 'restaurant');
    if (priceRange) {
      placesUrl.searchParams.set('minprice', priceRange.min.toString());
      placesUrl.searchParams.set('maxprice', priceRange.max.toString());
    }
    placesUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);
    
    if (pagetoken) {
      placesUrl.searchParams.set('pagetoken', pagetoken);
    }

    console.log('Fetching places:', { 
      lat, 
      lng, 
      radiusMeters, 
      cuisine: cuisine || 'any',
      priceLevel: priceLevel || 'any',
      enhancedKeyword,
      hasPageToken: !!pagetoken 
    });

    const response = await fetch(placesUrl.toString());
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data);
      return new Response(
        JSON.stringify({ error: `Google Places API error: ${data.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map response to desired format with price level filtering and restaurant exclusion
    const items = (data.results || [])
      .filter((place: any) => {
        // Exclude non-restaurants first
        if (shouldExcludeRestaurant(place.types || [], place.name || '')) {
          return false;
        }
        // Then apply price filtering
        if (!priceRange) return true;
        const placePrice = place.price_level || 2; // Default to moderate
        return placePrice >= priceRange.min && placePrice <= priceRange.max;
      })
      .map((place: any) => ({
        id: place.place_id,
        name: place.name,
        rating: place.rating || 0,
        totalRatings: place.user_ratings_total || 0,
        priceLevel: place.price_level ? '$'.repeat(place.price_level) : '',
        address: place.vicinity || '',
        lat: place.geometry?.location?.lat || 0,
        lng: place.geometry?.location?.lng || 0,
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
