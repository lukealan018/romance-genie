import type { ActivityProvider, ProviderActivity, ActivitySearchOptions } from '../activities-types.ts';

const FOURSQUARE_API_KEY = Deno.env.get('FOURSQUARE_API_KEY');

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

// Map keywords to Foursquare categories
// Major Foursquare category IDs for activities:
// 10000 - Arts & Entertainment
// 13003 - Bar
// 13065 - Nightlife Spot
// 18000 - Sports & Recreation
const keywordToCategoryMap: Record<string, string[]> = {
  // Bars and Nightlife
  'whiskey bar': ['13003', '13065'],
  'cocktail bar': ['13003', '13065'],
  'wine bar': ['13003', '13065'],
  'speakeasy': ['13003', '13065'],
  'lounge bar': ['13003', '13065'],
  'lounge': ['13003', '13065'],
  'sports bar': ['13003'],
  'dive bar': ['13003'],
  'rooftop bar': ['13003', '13065'],
  'tiki bar': ['13003'],
  'brewery': ['13003'],
  'jazz lounge': ['13003', '13065'],
  'hookah lounge': ['13003', '13065'],
  'cocktail lounge': ['13003', '13065'],
  'comedy club': ['10000'],
  'karaoke': ['13065', '10000'],
  'karaoke bar': ['13065', '10000'],
  'nightclub': ['13065'],
  'live music': ['10000', '13065'],
  
  // Entertainment and Recreation
  'bowling': ['18000'],
  'mini golf': ['18000'],
  'golf': ['18000'],
  'pool hall': ['18000'],
  'axe throwing': ['18000'],
  'escape room': ['10000'],
  'arcade': ['10000'],
  'movie theater': ['10000'],
  'wine tasting': ['13003'],
  'painting class': ['10000'],
  'paint and sip': ['10000'],
  'art gallery': ['10000'],
  'museum': ['10000'],
  'theater': ['10000'],
};

function getFoursquareCategories(keyword: string): string[] {
  const normalized = keyword.toLowerCase().trim();
  return keywordToCategoryMap[normalized] || ['13003', '10000', '18000']; // Default: bars, arts, sports
}

// Activity types that typically require tickets/advance booking
const eventTypes = new Set([
  'movie theater',
  'theater',
  'concert',
  'performing arts',
  'stadium',
  'casino',
]);

function determineCategory(name: string, categories: string[]): 'event' | 'activity' {
  const nameLower = name.toLowerCase();
  if (eventTypes.has(nameLower)) return 'event';
  
  // Check category names
  const categoryNames = categories.join(' ').toLowerCase();
  if (categoryNames.includes('movie') || 
      categoryNames.includes('theater') || 
      categoryNames.includes('concert') ||
      categoryNames.includes('stadium')) {
    return 'event';
  }
  
  return 'activity';
}

export const foursquareActivityProvider: ActivityProvider = {
  providerName: "foursquare",
  isEnabled: !!FOURSQUARE_API_KEY,
  
  async searchActivities(options: ActivitySearchOptions): Promise<ProviderActivity[]> {
    if (!FOURSQUARE_API_KEY) {
      console.warn('⚠️ Foursquare API key not configured');
      return [];
    }
    
    console.log('🟦 Foursquare provider: Searching activities');
    
    // Get Foursquare categories for this keyword
    const categories = getFoursquareCategories(options.keyword);
    
    // Build Foursquare Places API request
    const url = new URL('https://api.foursquare.com/v3/places/search');
    url.searchParams.set('ll', `${options.lat},${options.lng}`);
    url.searchParams.set('radius', options.radiusMeters.toString());
    url.searchParams.set('categories', categories.join(','));
    url.searchParams.set('limit', '50');
    
    // Add keyword query if not generic
    if (options.keyword && !['bar', 'activity'].includes(options.keyword.toLowerCase())) {
      url.searchParams.set('query', options.keyword);
    }
    
    // Add sort by relevance
    url.searchParams.set('sort', 'RELEVANCE');
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': FOURSQUARE_API_KEY,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('Foursquare API error:', response.status);
      throw new Error(`Foursquare API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    const results = (data.results || [])
      .map((place: any): ProviderActivity => {
        const placeLat = place.geocodes?.main?.latitude || 0;
        const placeLng = place.geocodes?.main?.longitude || 0;
        const distance = calculateDistance(options.lat, options.lng, placeLat, placeLng);
        
        // Normalize rating from Foursquare's 10-point scale to 5-point scale
        const normalizedRating = place.rating ? (place.rating / 10) * 5 : 0;
        
        return {
          id: place.fsq_id,
          name: place.name,
          address: place.location?.formatted_address || place.location?.address || '',
          rating: normalizedRating,
          lat: placeLat,
          lng: placeLng,
          source: "foursquare",
          totalRatings: place.stats?.total_ratings || 0,
          city: place.location?.locality,
          category: determineCategory(place.name, place.categories?.map((c: any) => c.name) || []),
          distance: distance,
          types: place.categories?.map((c: any) => c.name) || []
        };
      })
      .filter((item: ProviderActivity) => {
        // Filter by distance
        const radiusMiles = options.radiusMeters / 1609.34;
        const maxDistance = radiusMiles * 1.5; // Allow 50% buffer
        
        if (item.distance && item.distance > maxDistance) {
          return false;
        }
        
        // Soft city filter
        if (options.targetCity && item.city) {
          const inTargetCity = item.city.toLowerCase().includes(options.targetCity.toLowerCase()) ||
                                options.targetCity.toLowerCase().includes(item.city.toLowerCase());
          if (!inTargetCity && item.distance && item.distance > 5) {
            return false;
          }
        }
        
        return true;
      });
    
    console.log(`✅ Foursquare provider: Found ${results.length} activities`);
    return results;
  }
};
