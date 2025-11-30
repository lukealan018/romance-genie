import { mockPlacesProvider } from './providers/mock-provider.ts';
import { googlePlacesProvider } from './providers/google-provider.ts';
import { yelpPlacesProvider } from './providers/yelp-provider.ts';
import { foursquarePlacesProvider } from './providers/foursquare-provider.ts';
import { mergeAndDedupeResults } from './places-merger.ts';
import type { ProviderPlace, SearchOptions } from './places-types.ts';
import {
  MIN_RATING_RESTAURANT,
  MIN_REVIEW_COUNT,
  MIN_REVIEW_COUNT_IF_NO_PHOTOS,
} from './place-filters.ts';

const ALL_PROVIDERS = [
  googlePlacesProvider,      // Primary provider (enabled)
  yelpPlacesProvider,         // Disabled until configured
  foursquarePlacesProvider,   // Disabled until configured
  mockPlacesProvider,         // Disabled by default (enable for testing)
];

export interface PlacesSearchResult {
  items: ProviderPlace[];
  providerStats: Record<string, number>;
}

export async function getRestaurantSuggestions(
  options: SearchOptions
): Promise<PlacesSearchResult> {
  
  // Get enabled providers only
  const enabledProviders = ALL_PROVIDERS.filter(p => p.isEnabled);
  
  if (enabledProviders.length === 0) {
    console.warn('⚠️ No providers enabled! Check API key configuration.');
    return { items: [], providerStats: {} };
  }
  
  console.log(`🔍 Multi-provider search: Querying ${enabledProviders.length} enabled provider(s)`);
  console.log(`   Active: ${enabledProviders.map(p => p.providerName).join(', ')}`);
  
  // Query all providers in parallel
  const startTime = Date.now();
  const resultArrays = await Promise.allSettled(
    enabledProviders.map(provider => provider.searchRestaurants(options))
  );
  const queryTime = Date.now() - startTime;
  
  // Extract successful results and track stats
  const providerStats: Record<string, number> = {};
  const successfulResults: ProviderPlace[][] = [];
  
  resultArrays.forEach((result, i) => {
    const providerName = enabledProviders[i].providerName;
    
    if (result.status === 'fulfilled') {
      successfulResults.push(result.value);
      providerStats[providerName] = result.value.length;
      console.log(`   ✅ ${providerName}: ${result.value.length} results`);
    } else {
      providerStats[providerName] = 0;
      console.warn(`   ❌ ${providerName} failed:`, result.reason.message || result.reason);
    }
  });
  
  // Merge and dedupe
  const mergeStartTime = Date.now();
  const merged = mergeAndDedupeResults(successfulResults);
  const mergeTime = Date.now() - mergeStartTime;
  
  const totalRaw = successfulResults.flat().length;
  console.log(`📊 Combined ${totalRaw} raw results → ${merged.length} unique places`);
  
  // === QUALITY FLOOR FILTERING ===
  const qualityFiltered = merged.filter(place => {
    // Skip quality filters for Foursquare venues without premium data
    if (place.source === 'foursquare' && place.hasPremiumData === false) {
      return true; // Keep - can't evaluate quality
    }
    
    // Rating floor (only if rating exists and is > 0)
    if (place.rating > 0 && place.rating < MIN_RATING_RESTAURANT) {
      console.log(`🚫 Quality filter: "${place.name}" rating ${place.rating} < ${MIN_RATING_RESTAURANT}`);
      return false;
    }
    
    // Review count floor
    if (place.reviewCount < MIN_REVIEW_COUNT) {
      // TODO: Add "super new" mode exception for brand-new hidden gems
      console.log(`🚫 Quality filter: "${place.name}" reviews ${place.reviewCount} < ${MIN_REVIEW_COUNT}`);
      return false;
    }
    
    // No photos + low reviews = likely incomplete listing
    const hasPhotos = place.photos && place.photos.length > 0;
    if (!hasPhotos && place.reviewCount < MIN_REVIEW_COUNT_IF_NO_PHOTOS) {
      console.log(`🚫 Quality filter: "${place.name}" no photos + only ${place.reviewCount} reviews`);
      return false;
    }
    
    return true;
  });
  
  console.log(`📊 Quality filtering: ${merged.length} → ${qualityFiltered.length} places`);
  console.log(`⏱️ Query time: ${queryTime}ms | Merge time: ${mergeTime}ms | Total: ${queryTime + mergeTime}ms`);
  
  // Apply limit
  const limitedResults = qualityFiltered.slice(0, options.limit || 20);
  
  return {
    items: limitedResults,
    providerStats
  };
}
