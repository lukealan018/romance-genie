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

// Input validation helpers
function validateString(input: unknown, maxLength: number): string {
  if (input === undefined || input === null) return '';
  if (typeof input !== 'string') return '';
  const trimmed = input.trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function validateNumber(input: unknown, defaultVal?: number): number {
  if (input === undefined || input === null) return defaultVal ?? NaN;
  const num = typeof input === 'number' ? input : parseFloat(String(input));
  if (isNaN(num) || !isFinite(num)) return defaultVal ?? NaN;
  return num;
}

function validateNoveltyMode(input: unknown): NoveltyMode {
  const valid: NoveltyMode[] = ['balanced', 'hidden_gems', 'popular'];
  return valid.includes(input as NoveltyMode) ? (input as NoveltyMode) : 'balanced';
}

// Generate a signature hash for request deduplication/debugging
function generateRequestSignature(params: Record<string, unknown>): string {
  const sorted = Object.keys(params).sort().map(k => `${k}:${params[k]}`).join('|');
  let hash = 0;
  for (let i = 0; i < sorted.length; i++) {
    const char = sorted.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Debug metadata interface
interface DebugMetadata {
  signature: string;
  seedUsed: number | null;
  excludedCountsByReason: Record<string, number>;
  qualityFilteredCount: number;
  totalFromProviders: number;
  finalCount: number;
}

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
    let lat: number, lng: number, radiusMiles: number, cuisine: string, priceLevel: string | undefined, targetCity: string | undefined, noveltyMode: NoveltyMode, seed: number | undefined, forceFresh: boolean, venueType: 'any' | 'coffee' | 'brunch', searchTime: string | undefined, surpriseMe: boolean, excludePlaceIds: string[], debug: boolean;

    if (req.method === 'POST') {
      const body = await req.json();
      debug = body.debug === true;
      lat = validateNumber(body.lat);
      lng = validateNumber(body.lng);
      radiusMiles = validateNumber(body.radiusMiles);
      cuisine = validateString(body.cuisine, 100); // Limit cuisine to 100 chars
      priceLevel = validateString(body.priceLevel, 10) || undefined;
      targetCity = validateString(body.targetCity, 100) || undefined;
      noveltyMode = validateNoveltyMode(body.noveltyMode);
      seed = body.seed !== undefined ? validateNumber(body.seed) : undefined;
      forceFresh = body.forceFresh === true;
      venueType = body.venueType === 'coffee' ? 'coffee' : body.venueType === 'brunch' ? 'brunch' : 'any';
      searchTime = validateString(body.searchTime, 20) || undefined;
      surpriseMe = body.surpriseMe === true;
      excludePlaceIds = Array.isArray(body.excludePlaceIds) 
        ? body.excludePlaceIds.filter((id: unknown) => typeof id === 'string').slice(0, 100)
        : [];
    } else {
      const url = new URL(req.url);
      debug = url.searchParams.get('debug') === 'true';
      lat = validateNumber(url.searchParams.get('lat'));
      lng = validateNumber(url.searchParams.get('lng'));
      radiusMiles = validateNumber(url.searchParams.get('radiusMiles'));
      cuisine = validateString(url.searchParams.get('cuisine'), 100);
      priceLevel = validateString(url.searchParams.get('priceLevel'), 10) || undefined;
      targetCity = validateString(url.searchParams.get('targetCity'), 100) || undefined;
      noveltyMode = validateNoveltyMode(url.searchParams.get('noveltyMode'));
      seed = url.searchParams.get('seed') ? validateNumber(url.searchParams.get('seed')) : undefined;
      forceFresh = url.searchParams.get('forceFresh') === 'true';
      venueType = url.searchParams.get('venueType') === 'coffee' ? 'coffee' : url.searchParams.get('venueType') === 'brunch' ? 'brunch' : 'any';
      searchTime = validateString(url.searchParams.get('searchTime'), 20) || undefined;
      surpriseMe = url.searchParams.get('surpriseMe') === 'true';
      excludePlaceIds = [];
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
      cuisine: (venueType === 'coffee' || venueType === 'brunch') ? '' : cuisine, // Ignore cuisine for coffee/brunch search
      priceLevel: (venueType === 'coffee' || venueType === 'brunch') ? undefined : priceLevel, // Ignore price for coffee/brunch
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
    
    // Track exclusion reasons for debug
    const excludedCountsByReason: Record<string, number> = {
      previouslyShown: 0,
      distanceExceeded: 0,
      outsideTargetCity: 0,
    };
    
    const totalFromProviders = providerResults.length;
    
    const items: PlaceSearchResultItem[] = providerResults
      .filter((item: any) => {
        // Exclude previously shown places
        if (excludeSet.has(item.id)) {
          excludedCountsByReason.previouslyShown++;
          return false;
        }
        
        // Distance filter with buffer
        const maxDistance = radiusMilesNum * 1.5;
        if (item.distance && item.distance > maxDistance) {
          excludedCountsByReason.distanceExceeded++;
          return false;
        }
        
        // City filter (soft preference)
        if (targetCity && item.addressComponents) {
          const inTargetCity = isInTargetCity(item.addressComponents, targetCity);
          if (!inTargetCity && item.distance && item.distance > 5) {
            excludedCountsByReason.outsideTargetCity++;
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

    const totalExcluded = Object.values(excludedCountsByReason).reduce((a, b) => a + b, 0);
    console.log(`✅ Returning ${items.length} scored restaurants (forceFresh: ${forceFresh}, excluded: ${totalExcluded})`);

    // Generate request signature for debugging
    const signature = generateRequestSignature({ lat, lng, radiusMiles, cuisine, priceLevel, noveltyMode, venueType });

    // Build debug metadata if requested
    const debugMetadata: DebugMetadata | undefined = debug ? {
      signature,
      seedUsed: effectiveSeed ?? null,
      excludedCountsByReason,
      qualityFilteredCount: 0, // Quality filtering happens in places-service
      totalFromProviders,
      finalCount: items.length,
    } : undefined;

    return new Response(
      JSON.stringify({
        items,
        nextPageToken: null, // Multi-provider doesn't support pagination initially
        providerStats, // Include provider stats for debugging
        forceFresh, // Echo back for debugging
        ...(debugMetadata && { debug: debugMetadata }),
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
