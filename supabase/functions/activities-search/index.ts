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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { 
      lat, 
      lng, 
      radiusMiles, 
      keyword, 
      pagetoken, 
      targetCity, 
      noveltyMode = 'balanced' as NoveltyMode, 
      seed,
      forceFresh = false,
      surpriseMe = false,  // Skip shuffle, keep top hidden gems
      excludePlaceIds = []  // IDs to exclude from results
    } = body;

    if (!lat || !lng || !radiusMiles || !keyword) {
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
    
    const { items: activities, providerStats } = await getActivitySuggestions(searchOptions);
    
    // Create Set for O(1) exclusion lookups
    const excludeSet = new Set(excludePlaceIds);
    let excludedCount = 0;
    
    // Apply novelty scoring, sorting, and exclusion filtering
    const items = activities
      .filter((item: any) => {
        // Exclude previously shown activities
        if (excludeSet.has(item.id)) {
          excludedCount++;
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
        
        return {
          ...item,
          uniquenessScore: calculateUniquenessScore(placeData, noveltyMode),
          isHiddenGem: isHiddenGem(placeData),
          isNewDiscovery: isNewDiscovery(placeData),
          isLocalFavorite: isLocalFavorite(placeData)
        };
      })
      .sort((a: any, b: any) => {
        // Sort by uniqueness score (highest first), with distance as tiebreaker
        if (Math.abs(a.uniquenessScore - b.uniquenessScore) > 0.1) {
          return b.uniquenessScore - a.uniquenessScore;
        }
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
      const { addressComponents, distance, types, geometry, uniquenessScore, ...cleanItem } = item;
      return cleanItem;
    });

    console.log(`📊 Provider stats:`, providerStats);
    console.log(`✅ Returning ${cleanedItems.length} activities (forceFresh: ${forceFresh}, excluded: ${excludedCount})`);

    return new Response(
      JSON.stringify({
        items: cleanedItems,
        nextPageToken: null, // Multi-provider doesn't support pagination yet
        providerStats,
        forceFresh // Echo back for debugging
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
