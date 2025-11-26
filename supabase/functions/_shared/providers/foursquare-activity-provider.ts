import type { ActivityProvider, ProviderActivity, ActivitySearchOptions } from '../activities-types.ts';

const FOURSQUARE_API_KEY = Deno.env.get('FOURSQUARE_API_KEY')?.trim();
console.log(`🟦 Foursquare activity provider init: API key ${FOURSQUARE_API_KEY ? `present (${FOURSQUARE_API_KEY.length} chars, starts with: ${FOURSQUARE_API_KEY.substring(0, 4)}, ends with: ${FOURSQUARE_API_KEY.substring(FOURSQUARE_API_KEY.length - 4)})` : 'MISSING'}`);

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

// Map keywords to Foursquare category IDs (new API format)
const keywordToCategoryMap: Record<string, string[]> = {
  // Nightlife categories
  'bar': ['10033'],
  'wine bar': ['10038'],
  'cocktail': ['10034'],
  'cocktail bar': ['10034'],
  'dive bar': ['10035'],
  'sports bar': ['10037'],
  'nightclub': ['10039'],
  'lounge': ['10040'],
  'lounge bar': ['10040'],
  'whiskey bar': ['10033'],
  'speakeasy': ['10034'],
  'rooftop bar': ['10033'],
  'tiki bar': ['10033'],
  'brewery': ['10033'],
  'jazz lounge': ['10040'],
  'hookah lounge': ['10040'],
  'cocktail lounge': ['10040'],
  
  // Arts & Entertainment
  'movie': ['10002'],
  'movie theater': ['10002'],
  'theater': ['10004'],
  'comedy': ['10003'],
  'comedy club': ['10003'],
  'music': ['10005'],
  'live music': ['10005'],
  'jazz': ['10006'],
  'concert': ['10007'],
  'escape room': ['18045'],
  'arcade': ['18043'],
  'art gallery': ['10000'],
  'museum': ['10000'],
  'painting class': ['10000'],
  'paint and sip': ['10000'],
  
  // Recreation
  'bowling': ['18042'],
  'mini golf': ['18044'],
  'karaoke': ['18046'],
  'karaoke bar': ['18046'],
  'golf': ['18000'], // General recreation
  'pool hall': ['18000'],
  'axe throwing': ['18000'],
  'wine tasting': ['10038'],
};

function getFoursquareCategories(keyword: string): string[] {
  const normalized = keyword.toLowerCase().trim();
  
  // Check for exact or partial matches (longer keywords first)
  const sortedKeys = Object.keys(keywordToCategoryMap).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (normalized.includes(key)) {
      return keywordToCategoryMap[key];
    }
  }
  
  return ['10032']; // Default to Nightlife general category
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
    
    // Build Foursquare Places API request (new endpoint)
    const url = new URL('https://places-api.foursquare.com/places/search');
    url.searchParams.set('ll', `${options.lat},${options.lng}`);
    url.searchParams.set('radius', options.radiusMeters.toString());
    
    // Add category IDs for activity type
    url.searchParams.set('categories', categories.join(','));
    url.searchParams.set('limit', '50');
    
    console.log(`🟦 Foursquare Activity: Searching "${options.keyword}" with categories ${categories.join(',')}`);
    
    // Add keyword query for additional precision
    if (options.keyword && !['bar', 'activity'].includes(options.keyword.toLowerCase())) {
      url.searchParams.set('query', options.keyword);
    }
    
    // Add sort by relevance
    url.searchParams.set('sort', 'RELEVANCE');
    
    // Make API request with Bearer token format for Service API Key
    const authHeader = `Bearer ${FOURSQUARE_API_KEY}`;
    console.log(`🟦 Foursquare Activity: Making request to ${url.toString()}`);
    console.log(`🟦 Foursquare Activity: Auth header format: Bearer ${FOURSQUARE_API_KEY.substring(0, 4)}...${FOURSQUARE_API_KEY.substring(FOURSQUARE_API_KEY.length - 4)}`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'X-Places-Api-Version': '2025-06-17'
      }
    });
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`❌ Foursquare Activity API error: ${response.status} ${response.statusText}`);
      console.error(`❌ Foursquare error body: ${errorBody}`);
      console.error(`❌ Request URL was: ${url.toString()}`);
      console.error(`❌ Headers sent: Authorization: Bearer ${FOURSQUARE_API_KEY.substring(0,4)}...${FOURSQUARE_API_KEY.substring(FOURSQUARE_API_KEY.length - 4)}`);
      return [];
    }
    
    const data = await response.json();
    
    const results = (data.results || [])
      .map((place: any): ProviderActivity => {
        // Support both new and old field names for coordinates
        const placeLat = place.latitude || place.geocodes?.main?.latitude || 0;
        const placeLng = place.longitude || place.geocodes?.main?.longitude || 0;
        const distance = calculateDistance(options.lat, options.lng, placeLat, placeLng);
        
        // Normalize rating from Foursquare's 10-point scale to 5-point scale
        const normalizedRating = place.rating ? (place.rating / 10) * 5 : 0;
        
        return {
          id: place.fsq_place_id || place.fsq_id, // New field with fallback to old
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
