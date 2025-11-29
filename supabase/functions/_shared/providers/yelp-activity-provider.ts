// Yelp activity provider stub (nightlife, entertainment, events)
// Status: DISABLED - Ready for future integration

import type { ProviderActivity, ActivitySearchOptions, ActivityProvider } from '../activities-types.ts';

/**
 * Yelp Fusion API provider for activities (nightlife, entertainment).
 * 
 * Future integration steps:
 * 1. Obtain Yelp Fusion API key
 * 2. Add YELP_API_KEY to Supabase secrets
 * 3. Implement business search with activity categories
 * 4. Map Yelp businesses to ProviderActivity format
 */
export const yelpActivityProvider: ActivityProvider = {
  providerName: "yelp",
  isEnabled: false, // ⏸️ DISABLED - scaffolding only
  
  async searchActivities(options: ActivitySearchOptions): Promise<ProviderActivity[]> {
    // TODO: Future implementation
    //
    // Yelp Fusion API:
    // Endpoint: https://api.yelp.com/v3/businesses/search
    //
    // Key parameters:
    // - Authorization: Bearer YELP_API_KEY
    // - latitude: lat
    // - longitude: lng
    // - radius: in meters (max 40000)
    // - categories: comma-separated category aliases
    // - term: search keyword
    // - sort_by: 'best_match', 'rating', 'review_count', 'distance'
    //
    // Example request:
    // GET https://api.yelp.com/v3/businesses/search?
    //   latitude=34.0522&
    //   longitude=-118.2437&
    //   radius=40000&
    //   categories=nightlife,arts
    //
    // Yelp Category Aliases for activities:
    // - nightlife: bars, clubs, lounges
    // - arts: art galleries, museums
    // - active: bowling, golf, arcades
    // - entertainment: comedy clubs, karaoke
    // - localflavor: local experiences
    //
    // Response mapping to ProviderActivity:
    // - id: business.id
    // - name: business.name
    // - address: business.location.display_address.join(', ')
    // - rating: business.rating
    // - totalRatings: business.review_count
    // - lat/lng: business.coordinates
    // - category: 'activity'
    // - source: 'yelp'
    //
    // For now, return empty array (provider exists but inactive)
    console.log(`[Yelp Activities] Provider disabled - returning empty results`);
    return [];
  },
};
