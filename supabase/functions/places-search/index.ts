import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  calculateUniquenessScore, 
  isHiddenGem, 
  isNewDiscovery, 
  isLocalFavorite,
  type NoveltyMode 
} from "../_shared/scoring.ts";
import { getRestaurantSuggestions } from "../_shared/places-service.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Check if place is in target city using address_components
function isInTargetCity(addressComponents: any[], targetCity: string): boolean {
  if (!targetCity || !addressComponents) return true;
  
  const cityComponent = addressComponents.find((comp: any) =>
    comp.types.includes('locality')
  );
  
  if (cityComponent) {
    const placeCity = cityComponent.long_name.toLowerCase();
    const target = targetCity.toLowerCase();
    
    if (placeCity === target) return true;
    if (placeCity.replace(/\s+/g, '') === target.replace(/\s+/g, '')) return true;
    if (placeCity.includes(target) || target.includes(placeCity)) return true;
  }
  
  return false;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request parameters
    let lat: number, lng: number, radiusMiles: number, cuisine: string, priceLevel: string | undefined, targetCity: string | undefined, noveltyMode: NoveltyMode;

    if (req.method === 'POST') {
      const body = await req.json();
      lat = body.lat;
      lng = body.lng;
      radiusMiles = body.radiusMiles;
      cuisine = body.cuisine;
      priceLevel = body.priceLevel;
      targetCity = body.targetCity;
      noveltyMode = body.noveltyMode || 'balanced';
    } else {
      const url = new URL(req.url);
      lat = parseFloat(url.searchParams.get('lat') || '');
      lng = parseFloat(url.searchParams.get('lng') || '');
      radiusMiles = parseFloat(url.searchParams.get('radiusMiles') || '');
      cuisine = url.searchParams.get('cuisine') || '';
      priceLevel = url.searchParams.get('priceLevel') || undefined;
      targetCity = url.searchParams.get('targetCity') || undefined;
      noveltyMode = (url.searchParams.get('noveltyMode') as NoveltyMode) || 'balanced';
    }

    // Validate required parameters
    if (isNaN(lat) || isNaN(lng) || isNaN(radiusMiles)) {
      console.error('Invalid parameters:', { lat, lng, radiusMiles, cuisine });
      return new Response(
        JSON.stringify({ error: 'Missing or invalid required parameters: lat, lng, radiusMiles' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert miles to meters
    const radiusMeters = Math.round(radiusMiles * 1609.34);

    console.log('🔍 Multi-provider restaurant search:', { 
      lat, 
      lng, 
      radiusMiles, 
      cuisine: cuisine || 'any',
      priceLevel: priceLevel || 'any',
      targetCity: targetCity || 'none',
      noveltyMode
    });

    // Use multi-provider service to get restaurant suggestions
    const { items: providerResults, providerStats } = await getRestaurantSuggestions({
      lat,
      lng,
      radiusMeters,
      cuisine,
      priceLevel,
      targetCity,
      noveltyMode,
      limit: 50
    });

    console.log(`📊 Provider stats:`, providerStats);

    // Apply existing scoring and filtering logic
    const radiusMilesNum = radiusMiles;
    const items = providerResults
      .filter((item: any) => {
        // Distance filter with buffer
        const maxDistance = radiusMilesNum * 1.5;
        if (item.distance && item.distance > maxDistance) {
          return false;
        }
        
        // City filter (soft preference)
        if (targetCity && item.addressComponents) {
          const inTargetCity = isInTargetCity(item.addressComponents, targetCity);
          if (!inTargetCity && item.distance && item.distance > 5) {
            return false;
          }
        }
        
        return true;
      })
      .map((item: any) => {
        // Calculate uniqueness score for each item
        // Pass Foursquare-specific fields for free tier chain detection
        const placeData = {
          place_id: item.id,
          name: item.name,
          rating: item.rating,
          user_ratings_total: item.reviewCount,
          types: item.types || item.categories || [],
          geometry: item.geometry || {
            location: { lat: item.lat, lng: item.lng }
          },
          // Foursquare-specific fields
          source: item.source,
          chains: item.chains, // FREE tier field for chain detection
          hasPremiumData: item.hasPremiumData // Flag for neutral scoring
        };
        
        return {
          id: item.id,
          name: item.name,
          rating: item.rating,
          totalRatings: item.reviewCount,
          priceLevel: item.priceLevel ? '$'.repeat(item.priceLevel) : '',
          address: item.address,
          lat: item.lat,
          lng: item.lng,
          source: item.source,
          uniquenessScore: calculateUniquenessScore(placeData, noveltyMode),
          isHiddenGem: isHiddenGem(placeData),
          isNewDiscovery: isNewDiscovery(placeData),
          isLocalFavorite: isLocalFavorite(placeData),
          hasPremiumData: item.hasPremiumData // Pass through for UI display
        };
      })
      .sort((a: any, b: any) => {
        // Sort by uniqueness score (highest first), with rating as tiebreaker
        if (Math.abs(a.uniquenessScore - b.uniquenessScore) > 0.1) {
          return b.uniquenessScore - a.uniquenessScore;
        }
        return b.rating - a.rating;
      });

    console.log(`✅ Returning ${items.length} scored restaurants`);

    return new Response(
      JSON.stringify({
        items,
        nextPageToken: null, // Multi-provider doesn't support pagination initially
        providerStats // Include provider stats for debugging
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
