import type { ActivityProvider, ProviderActivity, ActivitySearchOptions } from '../activities-types.ts';
import {
  EXCLUDED_ALWAYS_TYPES,
  EXCLUDED_ACTIVITY_TYPES,
  hasExcludedType,
  isPrimarilyRestaurant,
  isRestaurantByKeyword,
  shouldExcludeAsTraditionalGolf,
  isEntertainmentGolf,
} from '../place-filters.ts';

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

// Venue type mappings - ENHANCED for better search results with DATE NIGHT CONCIERGE INTELLIGENCE
const activityMappings: Record<string, { googleType: string; keywords: string[] }> = {
  // === BARS & LOUNGES (Core) ===
  'whiskey bar': { googleType: 'bar', keywords: ['whiskey bar', 'whisky bar', 'bourbon bar', 'scotch bar'] },
  'cocktail bar': { googleType: 'bar', keywords: ['cocktail bar', 'mixology', 'craft cocktails', 'cocktail lounge'] },
  'wine bar': { googleType: 'bar', keywords: ['wine bar', 'wine lounge', 'wine tasting room', 'vino bar', 'enoteca'] },
  'speakeasy': { googleType: 'bar', keywords: ['speakeasy', 'hidden bar', 'secret bar', 'prohibition bar', 'cocktail lounge hidden', 'password bar', 'underground bar'] },
  'lounge bar': { googleType: 'bar', keywords: ['lounge bar', 'cocktail lounge', 'upscale lounge', 'lounge'] },
  'lounge': { googleType: 'bar', keywords: ['lounge', 'cocktail lounge', 'upscale lounge', 'bar lounge'] },
  'sports bar': { googleType: 'bar', keywords: ['sports bar', 'sports pub', 'sports grill'] },
  'dive bar': { googleType: 'bar', keywords: ['dive bar', 'local bar', 'neighborhood bar'] },
  'rooftop bar': { googleType: 'bar', keywords: ['rooftop bar', 'rooftop lounge', 'sky bar', 'rooftop'] },
  'tiki bar': { googleType: 'bar', keywords: ['tiki bar', 'tropical bar', 'rum bar', 'polynesian'] },
  'brewery': { googleType: 'bar', keywords: ['brewery', 'brewpub', 'craft brewery', 'taproom'] },
  'jazz lounge': { googleType: 'bar', keywords: ['jazz lounge', 'jazz bar', 'live jazz', 'jazz club'] },
  'hookah lounge': { googleType: 'bar', keywords: ['hookah lounge', 'shisha bar', 'hookah bar'] },
  'cocktail lounge': { googleType: 'bar', keywords: ['cocktail lounge', 'upscale lounge', 'craft cocktails'] },
  
  // === NIGHTLIFE & ENTERTAINMENT ===
  'comedy club': { googleType: 'night_club', keywords: ['comedy club', 'comedy show', 'stand up', 'comedy theater', 'improv comedy'] },
  'karaoke': { googleType: 'night_club', keywords: ['karaoke', 'karaoke bar', 'karaoke lounge', 'private karaoke'] },
  'karaoke bar': { googleType: 'night_club', keywords: ['karaoke bar', 'karaoke', 'private karaoke', 'karaoke room'] },
  'nightclub': { googleType: 'night_club', keywords: ['nightclub', 'club', 'dance club', 'night club'] },
  'live music': { googleType: 'night_club', keywords: ['live music', 'music venue', 'concert', 'live band', 'live entertainment'] },
  
  // === GAMING & RECREATION ===
  'bowling': { googleType: 'bowling_alley', keywords: ['bowling', 'bowling alley', 'bowling lanes', 'bowling lounge'] },
  'mini golf': { googleType: 'amusement_center', keywords: ['mini golf', 'putt putt', 'miniature golf', 'glow golf'] },
  'golf': { googleType: 'park', keywords: ['golf', 'golf course', 'driving range', 'top golf', 'topgolf'] },
  'pool hall': { googleType: 'bar', keywords: ['pool hall', 'billiards', 'pool table', 'billiard hall'] },
  'axe throwing': { googleType: 'amusement_center', keywords: ['axe throwing', 'hatchet throwing', 'axe bar'] },
  'escape room': { googleType: 'amusement_center', keywords: ['escape room', 'escape game', 'puzzle room', 'immersive experience'] },
  'arcade': { googleType: 'amusement_center', keywords: ['arcade', 'game room', 'barcade', 'video arcade', 'retro arcade'] },
  'movie theater': { googleType: 'movie_theater', keywords: ['movie theater', 'cinema', 'movie house', 'luxury cinema'] },
  
  // === ARTS & CULTURE ===
  'wine tasting': { googleType: 'bar', keywords: ['wine tasting', 'winery', 'vineyard', 'tasting room'] },
  'painting class': { googleType: 'art_gallery', keywords: ['painting class', 'paint night', 'sip and paint', 'paint party'] },
  'paint and sip': { googleType: 'art_gallery', keywords: ['paint and sip', 'wine and paint', 'sip and paint', 'canvas and cocktails'] },
  'art gallery': { googleType: 'art_gallery', keywords: ['art gallery', 'gallery', 'art exhibit', 'contemporary art'] },
  'museum': { googleType: 'museum', keywords: ['museum', 'exhibit', 'exhibition', 'art museum'] },
  'theater': { googleType: 'performing_arts_theater', keywords: ['theater', 'play', 'musical', 'theatre', 'live theater'] },
  
  // === OUTDOOR & DATE-WORTHY EXPERIENCES (NEW - Concierge Intelligence) ===
  'outdoor activity': { googleType: 'tourist_attraction', keywords: ['outdoor entertainment', 'outdoor venue', 'scenic view', 'outdoor experience', 'outdoor activity'] },
  'outdoor date': { googleType: 'tourist_attraction', keywords: ['sunset spot', 'scenic overlook', 'outdoor venue', 'romantic outdoor', 'date spot'] },
  'outdoor': { googleType: 'tourist_attraction', keywords: ['outdoor entertainment', 'scenic overlook', 'rooftop', 'outdoor venue', 'patio', 'garden venue'] },
  'fun outdoor': { googleType: 'tourist_attraction', keywords: ['outdoor entertainment', 'rooftop bar', 'outdoor venue', 'scenic view', 'beach activity'] },
  'sunset': { googleType: 'point_of_interest', keywords: ['sunset view', 'scenic overlook', 'rooftop', 'beach sunset', 'sunset spot'] },
  'sunset spot': { googleType: 'point_of_interest', keywords: ['sunset view', 'scenic overlook', 'rooftop bar', 'beach sunset'] },
  'scenic overlook': { googleType: 'point_of_interest', keywords: ['scenic overlook', 'viewpoint', 'scenic view', 'panoramic view'] },
  'rooftop': { googleType: 'bar', keywords: ['rooftop bar', 'rooftop lounge', 'rooftop restaurant', 'sky bar', 'rooftop venue'] },
  'outdoor movie': { googleType: 'movie_theater', keywords: ['outdoor cinema', 'drive-in', 'rooftop cinema', 'outdoor movie', 'movie in the park'] },
  'outdoor cinema': { googleType: 'movie_theater', keywords: ['outdoor cinema', 'drive-in theater', 'rooftop cinema', 'outdoor movie'] },
  'drive-in': { googleType: 'movie_theater', keywords: ['drive-in theater', 'drive-in movie', 'drive-in cinema'] },
  'beach bonfire': { googleType: 'beach', keywords: ['beach fire pit', 'beach bonfire', 'bonfire beach', 'fire pit'] },
  'bonfire': { googleType: 'beach', keywords: ['beach bonfire', 'fire pit venue', 'outdoor bonfire'] },
  'botanical garden': { googleType: 'tourist_attraction', keywords: ['botanical garden', 'garden venue', 'arboretum', 'botanical'] },
  'garden': { googleType: 'tourist_attraction', keywords: ['botanical garden', 'garden venue', 'sculpture garden', 'rose garden'] },
  'outdoor concert': { googleType: 'tourist_attraction', keywords: ['outdoor concert', 'amphitheater', 'outdoor music venue', 'concert in the park'] },
  'food truck park': { googleType: 'restaurant', keywords: ['food truck park', 'food truck', 'food truck lot', 'street food'] },
  'farmers market': { googleType: 'tourist_attraction', keywords: ['farmers market', 'artisan market', 'outdoor market', 'local market'] },
  'night market': { googleType: 'tourist_attraction', keywords: ['night market', 'evening market', 'food market', 'asian night market'] },
  'pier': { googleType: 'tourist_attraction', keywords: ['pier', 'boardwalk', 'waterfront', 'seaside'] },
  'waterfront': { googleType: 'tourist_attraction', keywords: ['waterfront', 'marina', 'harbor', 'lakefront', 'beachfront'] },
  
  // === UNIQUE DATE EXPERIENCES ===
  'cooking class': { googleType: 'restaurant', keywords: ['cooking class', 'culinary class', 'cooking experience', 'chef class'] },
  'pottery class': { googleType: 'art_gallery', keywords: ['pottery class', 'ceramics class', 'pottery studio', 'clay studio'] },
  'dance class': { googleType: 'gym', keywords: ['dance class', 'salsa class', 'dance studio', 'couples dance'] },
  'spa': { googleType: 'spa', keywords: ['spa', 'couples spa', 'day spa', 'massage', 'wellness'] },
  'couples spa': { googleType: 'spa', keywords: ['couples spa', 'couples massage', 'romantic spa', 'day spa'] },
  
  // Generic bar fallback with good keywords
  'bar': { googleType: 'bar', keywords: ['bar', 'cocktail bar', 'lounge bar', 'pub'] },
};

function getActivityMapping(keyword: string): { googleType: string; keywords: string[] } | null {
  const normalized = keyword.toLowerCase().trim();
  return activityMappings[normalized] || null;
}

// Category-specific allowlists and exclusions for comprehensive filtering
const venueFilters: Record<string, { allowlist: string[]; excludeTypes: string[]; excludeKeywords: string[] }> = {
  brewery: {
    allowlist: ['brewpub', 'craft brewery', 'microbrewery', 'taproom', 'beer garden', 'brewing company', 'brewery'],
    excludeTypes: ['liquor_store', 'convenience_store', 'supermarket', 'shopping_mall', 'department_store'],
    excludeKeywords: ['beer store', 'total wine', 'bevmo', 'liquor store', 'bottle shop', 'beverage store']
  },
  
  wine: {
    allowlist: ['winery', 'vineyard', 'wine cellar', 'tasting room', 'wine tasting', 'estate winery', 'wine cave', 'wine estate', 'cellar door'],
    excludeTypes: ['liquor_store', 'convenience_store', 'supermarket', 'shopping_mall', 'department_store', 'beauty_salon', 'hair_care', 'spa', 'nail_salon', 'barber_shop'],
    excludeKeywords: ['total wine', 'bevmo', 'liquor store', 'bottle shop', 'spirits store', '& more', 'wine + spirits']
  },
  
  art: {
    allowlist: ['art gallery', 'contemporary gallery', 'fine art gallery', 'sculpture garden', 'exhibition space', 'art museum', 'gallery', 'art center'],
    excludeTypes: ['furniture_store', 'home_goods_store', 'store', 'shopping_mall', 'department_store'],
    excludeKeywords: ['furniture', 'home goods', 'art supplies', 'michaels', 'hobby lobby', 'craft store', 'art supply']
  },
  
  golf: {
    allowlist: ['topgolf', 'top golf', 'driving range', 'mini golf', 'putt-putt', 'miniature golf', 'golf simulator', 'indoor golf', 'golf lounge', 'puttshack'],
    excludeTypes: ['sporting_goods_store', 'store', 'shopping_mall', 'department_store'],
    excludeKeywords: ['golf shop', 'golf store', 'sporting goods', "dick's sporting", 'golf galaxy', 'pga superstore', 'golf course', 'country club', 'golf club', 'golf resort']
  },
  
  painting: {
    allowlist: ['paint and sip', 'painting class', 'art studio', 'wine and paint', 'sip and paint', 'paint night', "painting with a twist", "pinot's palette", 'canvas and cocktails', 'paint bar'],
    excludeTypes: ['store', 'craft_store', 'home_goods_store', 'shopping_mall'],
    excludeKeywords: ['michaels', 'hobby lobby', 'art supplies', 'craft store', 'art supply', 'paint store']
  },
  
  hookah: {
    allowlist: ['hookah lounge', 'shisha lounge', 'hookah bar', 'shisha bar', 'hookah cafe', 'hookah spot'],
    excludeTypes: ['store', 'shopping_mall', 'convenience_store'],
    excludeKeywords: ['smoke shop', 'tobacco shop', 'vape shop', 'tobacco store', 'head shop']
  },
  
  theater: {
    allowlist: ['live theater', 'playhouse', 'performing arts', 'repertory', 'stage theater', 'broadway', 'community theater', 'theater company', 'theatre'],
    excludeTypes: ['movie_theater'],
    excludeKeywords: ['cinema', 'movie theater', 'amc', 'regal', 'cinemark', 'movies', 'imax']
  },
  
  comedy: {
    allowlist: ['comedy club', 'comedy theater', 'improv', 'stand-up comedy', 'laugh factory', 'comedy store', 'improv comedy'],
    excludeTypes: [],
    excludeKeywords: []
  }
};

function shouldExcludeActivity(placeTypes: string[], searchKeyword: string, placeName: string = ''): boolean {
  const keyword = searchKeyword.toLowerCase();
  const name = placeName.toLowerCase();
  
  // === PASS 0: Check centralized type exclusions ===
  const allExcludedTypes = [...EXCLUDED_ALWAYS_TYPES, ...EXCLUDED_ACTIVITY_TYPES];
  if (hasExcludedType(placeTypes, allExcludedTypes)) {
    console.log(`🚫 Google Activity: Excluding "${placeName}" - has excluded type`);
    return true;
  }
  
  // === PASS 1: Exclude pure restaurants from activities (unless they're bars) ===
  if (isPrimarilyRestaurant(placeTypes)) {
    console.log(`🚫 Google Activity: Excluding "${placeName}" - primarily a restaurant`);
    return true;
  }
  
  // Also check by name for restaurants
  if (isRestaurantByKeyword(name) && !placeTypes.some(t => ['bar', 'night_club', 'lounge'].includes(t.toLowerCase()))) {
    console.log(`🚫 Google Activity: Excluding "${placeName}" - restaurant by name`);
    return true;
  }
  
  // === PASS 2: Golf filtering using centralized logic ===
  if (keyword.includes('golf')) {
    if (shouldExcludeAsTraditionalGolf(name, placeTypes)) {
      console.log(`🚫 Google Activity: Excluding "${placeName}" - traditional golf`);
      return true;
    }
    // If it's entertainment golf, don't exclude
    if (isEntertainmentGolf(name)) {
      return false;
    }
  }
  
  // === PASS 3: Category-specific filtering ===
  let categoryFilter = null;
  
  if (keyword.includes('brewery') || keyword.includes('brewpub') || keyword.includes('beer')) {
    categoryFilter = venueFilters.brewery;
  } else if (keyword.includes('wine') || keyword.includes('bar') || keyword.includes('lounge') || keyword.includes('cocktail')) {
    categoryFilter = venueFilters.wine;
  } else if (keyword.includes('art') || keyword.includes('gallery') || keyword.includes('museum')) {
    categoryFilter = venueFilters.art;
  } else if (keyword.includes('paint') || keyword.includes('painting')) {
    categoryFilter = venueFilters.painting;
  } else if (keyword.includes('hookah') || keyword.includes('shisha')) {
    categoryFilter = venueFilters.hookah;
  } else if (keyword.includes('theater') || keyword.includes('theatre') || keyword.includes('play') || keyword.includes('musical')) {
    categoryFilter = venueFilters.theater;
  } else if (keyword.includes('comedy')) {
    categoryFilter = venueFilters.comedy;
  }
  
  // If no category filter matches, don't exclude
  if (!categoryFilter) return false;
  
  // Check allowlist - if match found, don't exclude
  if (categoryFilter.allowlist.some(venue => name.includes(venue))) {
    return false;
  }
  
  // Check exclusions - place types
  if (placeTypes.some(type => categoryFilter!.excludeTypes.includes(type))) {
    return true;
  }
  
  // Check exclusions - name keywords
  if (categoryFilter.excludeKeywords.some(kw => name.includes(kw))) {
    return true;
  }
  
  return false;
}

// Activity types that typically require tickets/advance booking
const eventTypes = new Set([
  'movie_theater',
  'night_club',
  'performing_arts_theater',
  'stadium',
  'concert_hall',
  'casino',
]);

function extractCity(addressComponents: any[]): string | undefined {
  const cityComponent = addressComponents?.find((comp: any) =>
    comp.types.includes('locality') || comp.types.includes('sublocality')
  );
  return cityComponent?.long_name;
}

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

// Check if place is in target city using address_components
function isInTargetCity(addressComponents: any[], targetCity: string): boolean {
  if (!targetCity || !addressComponents) return true;
  
  // Method 1: Check locality component (most accurate)
  const cityComponent = addressComponents.find((comp: any) =>
    comp.types.includes('locality')
  );
  
  if (cityComponent) {
    const placeCity = cityComponent.long_name.toLowerCase();
    const target = targetCity.toLowerCase();
    
    // Exact match
    if (placeCity === target) return true;
    
    // Handle variations (e.g., "Costa Mesa" vs "Costamesa")
    if (placeCity.replace(/\s+/g, '') === target.replace(/\s+/g, '')) return true;
    
    // Partial match for compound city names
    if (placeCity.includes(target) || target.includes(placeCity)) return true;
  }
  
  return false;
}

function determineCategory(types: string[]): 'event' | 'activity' {
  const hasEventType = types?.some(type => eventTypes.has(type));
  return hasEventType ? 'event' : 'activity';
}

export const googleActivityProvider: ActivityProvider = {
  providerName: "google",
  isEnabled: !!GOOGLE_MAPS_API_KEY,
  
  async searchActivities(options: ActivitySearchOptions): Promise<ProviderActivity[]> {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('⚠️ Google Places API key not configured');
      return [];
    }
    
    console.log('🌍 Google provider: Searching activities');
    
    // Get mapped Google Place type and enhanced keywords
    const mapping = getActivityMapping(options.keyword);
    const googlePlaceType = mapping?.googleType || null;
    let enhancedKeywords = mapping?.keywords.join(' ') || options.keyword;
    
    // Add city name to search query for precision
    if (options.targetCity) {
      enhancedKeywords = `${enhancedKeywords} in ${options.targetCity}`;
    }
    
    // Build Google Places API request
    const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    url.searchParams.set('location', `${options.lat},${options.lng}`);
    url.searchParams.set('radius', options.radiusMeters.toString());
    url.searchParams.set('keyword', enhancedKeywords);
    if (googlePlaceType) {
      url.searchParams.set('type', googlePlaceType);
    }
    url.searchParams.set('key', GOOGLE_MAPS_API_KEY);
    
    const response = await fetch(url.toString());
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status);
      throw new Error(`Google Places API error: ${data.status}`);
    }
    
    const radiusMiles = options.radiusMeters / 1609.34;
    
    const results = (data.results || [])
      .filter((place: any) => !shouldExcludeActivity(place.types || [], options.keyword, place.name || ''))
      .map((place: any): ProviderActivity => {
        const placeLat = place.geometry?.location?.lat || 0;
        const placeLng = place.geometry?.location?.lng || 0;
        const distance = calculateDistance(options.lat, options.lng, placeLat, placeLng);
        
        return {
          id: place.place_id,
          name: place.name,
          rating: place.rating || 0,
          totalRatings: place.user_ratings_total || 0,
          address: place.vicinity || place.formatted_address || '',
          lat: placeLat,
          lng: placeLng,
          source: "google",
          city: extractCity(place.address_components),
          category: determineCategory(place.types || []),
          distance: distance,
          types: place.types || [],
          addressComponents: place.address_components || [],
          geometry: place.geometry
        };
      })
      .filter((item: ProviderActivity) => {
        // Distance is the PRIMARY filter
        const maxDistance = radiusMiles * 1.5; // Allow 50% buffer beyond search radius
        if (item.distance && item.distance > maxDistance) {
          return false;
        }
        
        // City filter is a SOFT preference, not a hard boundary
        if (options.targetCity && item.addressComponents) {
          const inTargetCity = isInTargetCity(item.addressComponents, options.targetCity);
          if (!inTargetCity && item.distance && item.distance > 5) {
            return false;
          }
        }
        
        return true;
      });
    
    console.log(`✅ Google provider: Found ${results.length} activities`);
    return results;
  }
};
