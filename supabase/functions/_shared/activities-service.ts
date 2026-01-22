import { googleActivityProvider } from './providers/google-activity-provider.ts';
import { foursquareActivityProvider } from './providers/foursquare-activity-provider.ts';
import { ticketmasterProvider } from './providers/ticketmaster-provider.ts';
import { eventbriteProvider } from './providers/eventbrite-provider.ts';
import { yelpActivityProvider } from './providers/yelp-activity-provider.ts';
import { mergeAndDedupeActivities } from './activities-merger.ts';
import type { ProviderActivity, ActivitySearchOptions } from './activities-types.ts';
import {
  MIN_RATING_ACTIVITY,
  MIN_REVIEW_COUNT,
  MIN_REVIEW_COUNT_IF_NO_PHOTOS,
} from './place-filters.ts';

// All activity providers - disabled providers are filtered out at runtime
const ALL_PROVIDERS = [
  googleActivityProvider,       // ✅ ACTIVE - Primary provider
  foursquareActivityProvider,   // ✅ ACTIVE - Secondary provider
  yelpActivityProvider,         // ⏸️ READY (disabled) - Awaiting API key
  ticketmasterProvider,         // ⏸️ READY (disabled) - Awaiting API key + partnership
  eventbriteProvider,           // ⏸️ READY (disabled) - Awaiting API key
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
  
  // === QUALITY FLOOR FILTERING ===
  const qualityFiltered = merged.filter(activity => {
    // Skip quality filters for Ticketmaster events (events don't have ratings)
    if (activity.source === 'ticketmaster') {
      return true; // Keep - events are curated by nature
    }
    
    // Skip quality filters for Foursquare venues without premium data
    const hasPremiumData = (activity as any).hasPremiumData;
    if (activity.source === 'foursquare' && hasPremiumData === false) {
      return true; // Keep - can't evaluate quality
    }
    
    // Rating floor (only if rating exists and is > 0)
    if (activity.rating > 0 && activity.rating < MIN_RATING_ACTIVITY) {
      console.log(`🚫 Quality filter: "${activity.name}" rating ${activity.rating} < ${MIN_RATING_ACTIVITY}`);
      return false;
    }
    
    // Review count floor
    if (activity.totalRatings < MIN_REVIEW_COUNT) {
      // TODO: Add "super new" mode exception for brand-new discoveries
      console.log(`🚫 Quality filter: "${activity.name}" reviews ${activity.totalRatings} < ${MIN_REVIEW_COUNT}`);
      return false;
    }
    
    return true;
  });
  
  console.log(`📊 Quality filtering: ${merged.length} → ${qualityFiltered.length} activities`);
  console.log(`⏱️ Query time: ${queryTime}ms | Merge time: ${mergeTime}ms | Total: ${queryTime + mergeTime}ms`);
  
  // Apply limit
  const limitedResults = qualityFiltered.slice(0, options.limit || 20);
  
  return {
    items: limitedResults,
    providerStats
  };
}
