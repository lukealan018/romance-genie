import { mockPlacesProvider } from './providers/mock-provider.ts';
import { googlePlacesProvider } from './providers/google-provider.ts';
import { yelpPlacesProvider } from './providers/yelp-provider.ts';
import { foursquarePlacesProvider } from './providers/foursquare-provider.ts';
import { mergeAndDedupeResults } from './places-merger.ts';
import type { ProviderPlace, SearchOptions } from './places-types.ts';

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
  console.log(`⏱️ Query time: ${queryTime}ms | Merge time: ${mergeTime}ms | Total: ${queryTime + mergeTime}ms`);
  
  // Apply limit
  const limitedResults = merged.slice(0, options.limit || 20);
  
  return {
    items: limitedResults,
    providerStats
  };
}
