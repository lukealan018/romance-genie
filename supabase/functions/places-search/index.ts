import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  calculateUniquenessScore, 
  isHiddenGem, 
  isNewDiscovery, 
  isLocalFavorite,
  type NoveltyMode 
} from "../_shared/scoring.ts";
import { getRestaurantSuggestions } from "../_shared/places-service.ts";
import { buildBookingInsights } from "../_shared/booking-insights.ts";
import { FEATURE_FLAGS } from "../_shared/feature-flags.ts";
import type { BookingInsights } from "../_shared/booking-types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Response item type with optional booking insights
interface PlaceSearchResultItem {
  id: string;
  name: string;
  rating: number;
  totalRatings: number;
  priceLevel: string;
  address: string;
  lat: number;
  lng: number;
  source: string;
  uniquenessScore: number;
  isHiddenGem: boolean;
  isNewDiscovery: boolean;
  isLocalFavorite: boolean;
  hasPremiumData?: boolean;
  bookingInsights?: BookingInsights; // Optional - only when feature enabled
}

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
    let lat: number, lng: number, radiusMiles: number, cuisine: string, priceLevel: string | undefined, targetCity: string | undefined, noveltyMode: NoveltyMode, seed: number | undefined, forceFresh: boolean, venueType: 'any' | 'coffee', searchTime: string | undefined, surpriseMe: boolean, excludePlaceIds: string[];

    if (req.method === 'POST') {
      const body = await req.json();
      lat = body.lat;
      lng = body.lng;
      radiusMiles = body.radiusMiles;
      cuisine = body.cuisine;
      priceLevel = body.priceLevel;
      targetCity = body.targetCity;
      noveltyMode = body.noveltyMode || 'balanced';
      seed = body.seed; // Optional seed for randomization
      forceFresh = body.forceFresh === true; // Force fresh results
      venueType = body.venueType || 'any'; // Coffee shop filter
      searchTime = body.searchTime; // For dinner-time exclusion
      surpriseMe = body.surpriseMe === true; // Skip shuffle, keep top hidden gems
      excludePlaceIds = body.excludePlaceIds || []; // IDs to exclude from results
    } else {
      const url = new URL(req.url);
      lat = parseFloat(url.searchParams.get('lat') || '');
      lng = parseFloat(url.searchParams.get('lng') || '');
      radiusMiles = parseFloat(url.searchParams.get('radiusMiles') || '');
      cuisine = url.searchParams.get('cuisine') || '';
      priceLevel = url.searchParams.get('priceLevel') || undefined;
      targetCity = url.searchParams.get('targetCity') || undefined;
      noveltyMode = (url.searchParams.get('noveltyMode') as NoveltyMode) || 'balanced';
      seed = url.searchParams.get('seed') ? parseInt(url.searchParams.get('seed')!) : undefined;
      forceFresh = url.searchParams.get('forceFresh') === 'true';
      venueType = (url.searchParams.get('venueType') as 'any' | 'coffee') || 'any';
      searchTime = url.searchParams.get('searchTime') || undefined;
      surpriseMe = url.searchParams.get('surpriseMe') === 'true';
      excludePlaceIds = []; // Not supported via GET params
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
      noveltyMode,
      seed: seed || 'none',
      forceFresh,
      venueType,
      searchTime: searchTime || 'none',
      surpriseMe,
      excludePlaceIds: excludePlaceIds.length,
      bookingInsightsEnabled: FEATURE_FLAGS.ENABLE_BOOKING_INSIGHTS
    });

    // If forceFresh, add variation to prevent any caching
    let effectiveSeed = seed;
    if (forceFresh && effectiveSeed === undefined) {
      effectiveSeed = Math.floor(Math.random() * 1000000);
      console.log('🔄 Force fresh: generated random seed:', effectiveSeed);
    }

    // Use multi-provider service to get restaurant suggestions
    const { items: providerResults, providerStats } = await getRestaurantSuggestions({
      lat,
      lng,
      radiusMeters,
      cuisine: venueType === 'coffee' ? '' : cuisine, // Ignore cuisine for coffee search
      priceLevel: venueType === 'coffee' ? undefined : priceLevel, // Ignore price for coffee
      targetCity,
      noveltyMode,
      limit: 50,
      venueType,
      searchTime
    });

    console.log(`📊 Provider stats:`, providerStats);

    // Apply existing scoring and filtering logic
    const radiusMilesNum = radiusMiles;
    
    // Create Set for O(1) exclusion lookups
    const excludeSet = new Set(excludePlaceIds);
    let excludedCount = 0;
    
    const items: PlaceSearchResultItem[] = providerResults
      .filter((item: any) => {
        // Exclude previously shown places
        if (excludeSet.has(item.id)) {
          excludedCount++;
          return false;
        }
        
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
        
        // Build booking insights if feature is enabled
        const bookingInsights = FEATURE_FLAGS.ENABLE_BOOKING_INSIGHTS 
          ? buildBookingInsights({
              id: item.id,
              name: item.name,
              address: item.address,
              rating: item.rating,
              priceLevel: item.priceLevel,
              lat: item.lat,
              lng: item.lng,
              source: item.source,
              reviewCount: item.reviewCount,
              photos: item.photos || [],
              categories: item.categories || []
            })
          : undefined;
        
        const result: PlaceSearchResultItem = {
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
          hasPremiumData: item.hasPremiumData,
          // Only include bookingInsights when defined (removes undefined from output)
          ...(bookingInsights && { bookingInsights })
        };
        
        return result;
      })
      // DATE NIGHT QUALITY BIAS: Prioritize quality for a concierge experience
      .sort((a, b) => {
        // Primary: Rating (higher is better) - quality comes first
        const ratingDiff = b.rating - a.rating;
        if (Math.abs(ratingDiff) > 0.3) {
          return ratingDiff;
        }
        
        // Secondary: Price level (higher = more upscale = better for date night)
        const aPriceScore = a.priceLevel.length || 2; // Default to $$ if unknown
        const bPriceScore = b.priceLevel.length || 2;
        if (aPriceScore !== bPriceScore) {
          return bPriceScore - aPriceScore; // Higher price first
        }
        
        // Tertiary: Uniqueness score (for hidden gems)
        return b.uniquenessScore - a.uniquenessScore;
      });

    // SURPRISE ME MODE: Don't shuffle - keep top hidden gems in score order!
    // Only shuffle for regular searches (not Surprise Me)
    if (effectiveSeed !== undefined && !surpriseMe) {
      console.log(`🎲 Shuffling results with seed: ${effectiveSeed}`);
      // Seeded random shuffle using the seed
      const seededRandom = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
      };
      
      // Fisher-Yates shuffle with seeded random
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(effectiveSeed + i) * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
    } else if (surpriseMe) {
      console.log(`✨ Surprise Me mode: keeping top ${Math.min(15, items.length)} hidden gems in score order`);
      // Take only top 15 hidden gems, no shuffle
      items.splice(15);
    }

    // Log booking insights stats when feature is enabled
    if (FEATURE_FLAGS.ENABLE_BOOKING_INSIGHTS) {
      const recommendedCount = items.filter(i => i.bookingInsights?.reservationRecommended).length;
      console.log(`📅 Booking insights: ${recommendedCount}/${items.length} recommend reservations`);
    }

    console.log(`✅ Returning ${items.length} scored restaurants (forceFresh: ${forceFresh}, excluded: ${excludedCount})`);

    return new Response(
      JSON.stringify({
        items,
        nextPageToken: null, // Multi-provider doesn't support pagination initially
        providerStats, // Include provider stats for debugging
        forceFresh // Echo back for debugging
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
