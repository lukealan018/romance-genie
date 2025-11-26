import { googleActivityProvider } from './providers/google-activity-provider.ts';
import { foursquareActivityProvider } from './providers/foursquare-activity-provider.ts';
import { mergeAndDedupeActivities } from './activities-merger.ts';
import type { ProviderActivity, ActivitySearchOptions } from './activities-types.ts';

const ALL_PROVIDERS = [
  googleActivityProvider,       // Primary provider (enabled)
  foursquareActivityProvider,   // Enabled if API key configured
];

export interface ActivitySearchResult {
  items: ProviderActivity[];
  providerStats: Record<string, number>;
}

export async function getActivitySuggestions(
  options: ActivitySearchOptions
): Promise<ActivitySearchResult> {
  
  // Get enabled providers only
  const enabledProviders = ALL_PROVIDERS.filter(p => p.isEnabled);
  
  if (enabledProviders.length === 0) {
    console.warn('⚠️ No activity providers enabled! Check API key configuration.');
    return { items: [], providerStats: {} };
  }
  
  console.log(`🔍 Multi-provider activity search: Querying ${enabledProviders.length} enabled provider(s)`);
  console.log(`   Active: ${enabledProviders.map(p => p.providerName).join(', ')}`);
  
  // Query all providers in parallel
  const startTime = Date.now();
  const resultArrays = await Promise.allSettled(
    enabledProviders.map(provider => provider.searchActivities(options))
  );
  const queryTime = Date.now() - startTime;
  
  // Extract successful results and track stats
  const providerStats: Record<string, number> = {};
  const successfulResults: ProviderActivity[][] = [];
  
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
  const merged = mergeAndDedupeActivities(successfulResults);
  const mergeTime = Date.now() - mergeStartTime;
  
  const totalRaw = successfulResults.flat().length;
  console.log(`📊 Combined ${totalRaw} raw results → ${merged.length} unique activities`);
  console.log(`⏱️ Query time: ${queryTime}ms | Merge time: ${mergeTime}ms | Total: ${queryTime + mergeTime}ms`);
  
  // Apply limit
  const limitedResults = merged.slice(0, options.limit || 20);
  
  return {
    items: limitedResults,
    providerStats
  };
}
