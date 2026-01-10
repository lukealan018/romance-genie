import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { 
  calculateUniquenessScore, 
  isHiddenGem, 
  isNewDiscovery, 
  isLocalFavorite,
  type NoveltyMode 
} from "../_shared/scoring.ts";
import { getActivitySuggestions } from "../_shared/activities-service.ts";
import type { ActivitySearchOptions } from "../_shared/activities-types.ts";
import {
  isGenericPark,
  calculateDateScore,
  areResultsWeak,
  getFallbackKeywords,
  OUTDOOR_FALLBACKS,
} from "../_shared/concierge-suggestions.ts";

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    
    // Validate and sanitize all inputs
    const lat = validateNumber(body.lat);
    const lng = validateNumber(body.lng);
    const radiusMiles = validateNumber(body.radiusMiles);
    const keyword = validateString(body.keyword, 200); // Limit keyword to 200 chars
    const targetCity = validateString(body.targetCity, 100) || undefined;
    const noveltyMode = validateNoveltyMode(body.noveltyMode);
    const seed = body.seed !== undefined ? validateNumber(body.seed) : undefined;
    const forceFresh = body.forceFresh === true;
    const surpriseMe = body.surpriseMe === true;
    const debug = body.debug === true;
    const excludePlaceIds = Array.isArray(body.excludePlaceIds) 
      ? body.excludePlaceIds.filter((id: unknown) => typeof id === 'string').slice(0, 100)
      : [];

    if (isNaN(lat) || isNaN(lng) || isNaN(radiusMiles) || !keyword) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: lat, lng, radiusMiles, keyword' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const radiusMeters = Math.round(radiusMiles * 1609.34);
    
    console.log('=== MULTI-PROVIDER ACTIVITY SEARCH ===');
    console.log('Keyword:', keyword);
    console.log('Location:', { lat, lng });
    console.log('Radius (miles):', radiusMiles);
    console.log('Target City:', targetCity);
    console.log('Novelty Mode:', noveltyMode);
    console.log('Seed:', seed || 'none');
    console.log('Force Fresh:', forceFresh);
    console.log('Surprise Me:', surpriseMe);
    console.log('Exclude IDs:', excludePlaceIds.length);
    console.log('======================================');

    // If forceFresh, generate a new seed to ensure different results
    let effectiveSeed = seed;
    if (forceFresh && effectiveSeed === undefined) {
      effectiveSeed = Math.floor(Math.random() * 1000000);
      console.log('🔄 Force fresh: generated random seed:', effectiveSeed);
    }

    // Detect if this is an outdoor/fun activity search
    const keywordLower = keyword.toLowerCase();
    const isOutdoorSearch = keywordLower.includes('outdoor') || 
                           keywordLower.includes('fun') || 
                           keywordLower.includes('outside') ||
                           keywordLower.includes('activity');

    // Use multi-provider service
    const searchOptions: ActivitySearchOptions = {
      lat,
      lng,
      radiusMeters,
      keyword,
      targetCity,
      noveltyMode,
      limit: 50
    };
    
    let { items: activities, providerStats } = await getActivitySuggestions(searchOptions);
    
    const totalFromProviders = activities.length;
    
    // Track exclusion reasons for debug
    const excludedCountsByReason: Record<string, number> = {
      previouslyShown: 0,
      genericPark: 0,
    };
    
    // === CONCIERGE INTELLIGENCE: Filter out generic parks for outdoor searches ===
    if (isOutdoorSearch) {
      const beforeFilter = activities.length;
      activities = activities.filter((item: any) => {
        const isGeneric = isGenericPark(item.name, item.types || []);
        if (isGeneric) {
          excludedCountsByReason.genericPark++;
          console.log(`🚫 Concierge filter: Excluding generic park "${item.name}"`);
        }
        return !isGeneric;
      });
      console.log(`🎯 Concierge: Filtered ${beforeFilter - activities.length} generic parks from outdoor search`);
    }
    
    // === CONCIERGE INTELLIGENCE: Check if results are weak and need fallback ===
    const resultsAreWeak = areResultsWeak(activities, keyword);
    
    if (resultsAreWeak) {
      console.log(`⚠️ Concierge: Weak results detected for "${keyword}" - attempting fallback search`);
      
      // Get fallback keywords
      const fallbackKeywords = getFallbackKeywords(keyword, true);
      
      if (fallbackKeywords.length > 0) {
        // Try alternative searches
        const fallbackPromises = fallbackKeywords.slice(0, 3).map(async (fbKeyword) => {
          const fbOptions: ActivitySearchOptions = {
            lat,
            lng,
            radiusMeters,
            keyword: fbKeyword,
            targetCity,
            noveltyMode,
            limit: 10
          };
          
          try {
            const { items } = await getActivitySuggestions(fbOptions);
            return items;
          } catch (e) {
            console.warn(`Fallback search for "${fbKeyword}" failed:`, e);
            return [];
          }
        });
        
        const fallbackResults = await Promise.allSettled(fallbackPromises);
        const additionalItems = fallbackResults
          .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
          .flatMap(r => r.value);
        
        console.log(`📈 Concierge: Found ${additionalItems.length} additional items from fallback searches`);
        
        // Merge fallback results (avoiding duplicates)
        const existingIds = new Set(activities.map((a: any) => a.id));
        const uniqueFallbacks = additionalItems.filter((item: any) => !existingIds.has(item.id));
        
        activities = [...activities, ...uniqueFallbacks];
        console.log(`📊 Concierge: Total activities after fallback: ${activities.length}`);
      }
    }
    
    // Create Set for O(1) exclusion lookups
    const excludeSet = new Set(excludePlaceIds);
    
    // Apply novelty scoring, sorting, and exclusion filtering
    const items = activities
      .filter((item: any) => {
        // Exclude previously shown activities
        if (excludeSet.has(item.id)) {
          excludedCountsByReason.previouslyShown++;
          return false;
        }
        return true;
      })
      .map((item: any) => {
        // Calculate uniqueness score for each item
        const placeData = {
          place_id: item.id,
          name: item.name,
          rating: item.rating,
          user_ratings_total: item.totalRatings,
          types: item.types || [],
          geometry: item.geometry
        };
        
        // Calculate date-worthiness score
        const dateScore = calculateDateScore(item.name, item.rating, item.totalRatings);
        
        return {
          ...item,
          uniquenessScore: calculateUniquenessScore(placeData, noveltyMode),
          dateScore, // Add date-worthiness score
          isHiddenGem: isHiddenGem(placeData),
          isNewDiscovery: isNewDiscovery(placeData),
          isLocalFavorite: isLocalFavorite(placeData)
        };
      })
      .sort((a: any, b: any) => {
        // === DATE NIGHT CONCIERGE SORTING ===
        // 1. First priority: Rating (higher is better)
        if (Math.abs((a.rating || 0) - (b.rating || 0)) > 0.2) {
          return (b.rating || 0) - (a.rating || 0);
        }
        
        // 2. Second priority: Date-worthiness score
        if (Math.abs((a.dateScore || 0) - (b.dateScore || 0)) > 5) {
          return (b.dateScore || 0) - (a.dateScore || 0);
        }
        
        // 3. Third priority: Uniqueness score
        if (Math.abs(a.uniquenessScore - b.uniquenessScore) > 0.1) {
          return b.uniquenessScore - a.uniquenessScore;
        }
        
        // 4. Final tiebreaker: Distance
        return (a.distance || 0) - (b.distance || 0);
      });
    
    // SURPRISE ME MODE: Don't shuffle - keep top hidden gems in score order!
    // Only shuffle for regular searches (not Surprise Me)
    if (effectiveSeed !== undefined && !surpriseMe) {
      console.log(`🎲 Shuffling activity results with seed: ${effectiveSeed}`);
      const seededRandom = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
      };
      
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(effectiveSeed + i) * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
    } else if (surpriseMe) {
      console.log(`✨ Surprise Me mode: keeping top ${Math.min(15, items.length)} hidden gems in score order`);
      // Take only top 15 hidden gems, no shuffle
      items.splice(15);
    }
    
    // Remove internal fields before returning
    const cleanedItems = items.map((item: any) => {
      const { addressComponents, distance, types, geometry, uniquenessScore, dateScore, ...cleanItem } = item;
      return cleanItem;
    });

    console.log(`📊 Provider stats:`, providerStats);
    const totalExcluded = Object.values(excludedCountsByReason).reduce((a, b) => a + b, 0);
    console.log(`✅ Returning ${cleanedItems.length} activities (forceFresh: ${forceFresh}, excluded: ${totalExcluded})`);

    // Generate request signature for debugging
    const signature = generateRequestSignature({ lat, lng, radiusMiles, keyword, noveltyMode });

    // Build debug metadata if requested
    const debugMetadata: DebugMetadata | undefined = debug ? {
      signature,
      seedUsed: effectiveSeed ?? null,
      excludedCountsByReason,
      qualityFilteredCount: 0, // Quality filtering happens in activities-service
      totalFromProviders,
      finalCount: cleanedItems.length,
    } : undefined;

    return new Response(
      JSON.stringify({
        items: cleanedItems,
        nextPageToken: null, // Multi-provider doesn't support pagination yet
        providerStats,
        forceFresh, // Echo back for debugging
        ...(debugMetadata && { debug: debugMetadata }),
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
