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
    const { lat, lng, radiusMiles, keyword, pagetoken, targetCity, noveltyMode = 'balanced' as NoveltyMode } = await req.json();

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
    console.log('======================================');

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
    
    // Apply novelty scoring and sorting
    const items = activities
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
      })
      .map((item: any) => {
        // Remove internal fields before returning
        const { addressComponents, distance, types, geometry, uniquenessScore, ...cleanItem } = item;
        return cleanItem;
      });

    console.log(`📊 Provider stats:`, providerStats);
    console.log(`✅ Returning ${items.length} activities`);

    return new Response(
      JSON.stringify({
        items,
        nextPageToken: null, // Multi-provider doesn't support pagination yet
        providerStats
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
