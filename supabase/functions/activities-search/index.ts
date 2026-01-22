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

// ============= INTENT-BASED KEYWORD DETECTION =============
// Event-heavy keywords (prioritize Ticketmaster)
const EVENT_KEYWORDS = ['comedy', 'concert', 'theater', 'show', 'live music', 'festival', 'tour', 'stand up', 'tickets', 'performance', 'musical'];

// Venue-heavy keywords (prioritize Google/Foursquare)
const VENUE_KEYWORDS = ['bar', 'bowling', 'arcade', 'escape room', 'brewery', 'lounge', 'pool hall', 'mini golf', 'speakeasy', 'karaoke', 'wine bar', 'whiskey bar', 'tiki'];

type SearchIntent = 'events' | 'venues' | 'mixed';

function detectSearchIntent(keyword: string): SearchIntent {
  const lower = keyword.toLowerCase();
  const isEvent = EVENT_KEYWORDS.some(k => lower.includes(k));
  const isVenue = VENUE_KEYWORDS.some(k => lower.includes(k));
  
  if (isEvent && !isVenue) return 'events';
  if (isVenue && !isEvent) return 'venues';
  return 'mixed';
}

// Round-robin interleave results from different providers
function interleaveByProvider(items: any[]): any[] {
  const bySource: Record<string, any[]> = {};
  items.forEach(item => {
    const source = item.source || 'google';
    if (!bySource[source]) bySource[source] = [];
    bySource[source].push(item);
  });
  
  const result: any[] = [];
  const sources = Object.keys(bySource);
  if (sources.length === 0) return result;
  
  const maxLen = Math.max(...sources.map(s => bySource[s].length));
  
  for (let i = 0; i < maxLen; i++) {
    for (const source of sources) {
      if (bySource[source][i]) {
        result.push(bySource[source][i]);
      }
    }
  }
  return result;
}

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
    const liveEventsOnly = body.liveEventsOnly === true;
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
    console.log('Live Events Only:', liveEventsOnly);
    console.log('Exclude IDs:', excludePlaceIds.length);
    console.log('======================================');
    
    // Detect search intent from keyword
    const searchIntent = detectSearchIntent(keyword);
    console.log('🎯 Search Intent:', searchIntent);

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
    let items = activities
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
      .map((item: any) => item); // Preserve items for intent-based sorting
    
    // === LIVE EVENTS ONLY MODE ===
    if (liveEventsOnly) {
      const beforeFilter = items.length;
      items = items.filter((item: any) => item.source === 'ticketmaster' || item.source === 'eventbrite');
      console.log(`🎫 Live Events mode: filtered ${beforeFilter} → ${items.length} (Ticketmaster/Eventbrite only)`);
    }
    
    // === INTENT-BASED SORTING ===
    if (searchIntent === 'events') {
      // Event intent: Ticketmaster/Eventbrite first, then venues
      console.log('🎭 Sorting for EVENT intent: prioritizing Ticketmaster');
      items.sort((a: any, b: any) => {
        const aIsEvent = a.source === 'ticketmaster' || a.source === 'eventbrite';
        const bIsEvent = b.source === 'ticketmaster' || b.source === 'eventbrite';
        if (aIsEvent && !bIsEvent) return -1;
        if (!aIsEvent && bIsEvent) return 1;
        // Within same category, sort by rating
        return (b.rating || 0) - (a.rating || 0);
      });
    } else if (searchIntent === 'venues') {
      // Venue intent: Google/Foursquare first, then events
      console.log('🍸 Sorting for VENUE intent: prioritizing Google/Foursquare');
      items.sort((a: any, b: any) => {
        const aIsVenue = a.source === 'google' || a.source === 'foursquare';
        const bIsVenue = b.source === 'google' || b.source === 'foursquare';
        if (aIsVenue && !bIsVenue) return -1;
        if (!aIsVenue && bIsVenue) return 1;
        // Within same category, sort by rating
        return (b.rating || 0) - (a.rating || 0);
      });
    } else {
      // Mixed intent: Round-robin interleave for variety
      console.log('🔀 Mixed intent: interleaving providers for variety');
      // First sort each source by rating, then interleave
      items.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
      items = interleaveByProvider(items);
    }
    
    // SURPRISE ME MODE: Don't shuffle - keep in intent-sorted order
    if (surpriseMe) {
      console.log(`✨ Surprise Me mode: keeping top ${Math.min(15, items.length)} in intent-sorted order`);
      items.splice(15);
    } else if (effectiveSeed !== undefined) {
      // Regular search with seed: light shuffle while preserving top results
      console.log(`🎲 Shuffling activity results with seed: ${effectiveSeed}`);
      const seededRandom = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
      };
      
      // Only shuffle positions 5+ to preserve top picks
      const top5 = items.slice(0, 5);
      const rest = items.slice(5);
      
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(effectiveSeed + i) * (i + 1));
        [rest[i], rest[j]] = [rest[j], rest[i]];
      }
      
      items = [...top5, ...rest];
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
