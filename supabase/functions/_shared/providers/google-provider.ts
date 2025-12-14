import type { PlacesProvider, ProviderPlace, SearchOptions } from '../places-types.ts';
import {
  EXCLUDED_ALWAYS_TYPES,
  EXCLUDED_RESTAURANT_TYPES,
  hasExcludedType,
} from '../place-filters.ts';

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

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

// Coffee shop filtering patterns
const COFFEE_KEEP_PATTERNS = /coffee|café|cafe|espresso|roasters|roastery/i;
const COFFEE_EXCLUDE_PATTERNS = /boba|bubble|milk tea|tapioca|tea shop|tea house|teahouse|starbucks/i;

// Check if it's dinner time (14:00 or later)
function isDinnerTime(searchTime?: string): boolean {
  if (!searchTime) return false;
  const [hours] = searchTime.split(':').map(Number);
  return hours >= 14;
}

// Restaurant filtering using centralized exclusion lists
function shouldExcludeRestaurant(placeTypes: string[], placeName: string = ''): boolean {
  const name = placeName.toLowerCase();
  
  // PASS 1: Allowlist legitimate restaurants
  const restaurantKeywords = [
    'restaurant', 'bistro', 'cafe', 'steakhouse', 'trattoria', 
    'brasserie', 'eatery', 'dining', 'grill', 'kitchen', 
    'pizzeria', 'tavern', 'pub', 'diner', 'bar & grill'
  ];
  
  if (restaurantKeywords.some(keyword => name.includes(keyword))) {
    return false;
  }
  
  // PASS 2: Check centralized type exclusions
  const allExcludedTypes = [...EXCLUDED_ALWAYS_TYPES, ...EXCLUDED_RESTAURANT_TYPES];
  if (hasExcludedType(placeTypes, allExcludedTypes)) {
    return true;
  }
  
  // PASS 3: Name-based exclusions (grocery stores, gas stations, etc.)
  const excludeKeywords = [
    'whole foods', 'trader joe', '7-eleven', 'chevron', 
    'shell', 'arco', 'grocery', 'market', 'walmart', 
    'target', 'costco', 'safeway', 'ralphs', 'vons',
    'total wine', 'bevmo', 'liquor store'
  ];
  
  return excludeKeywords.some(keyword => name.includes(keyword));
}

// Check if a place is a pure coffee/cafe venue (for dinner-time exclusion)
function isPureCoffeeVenue(placeTypes: string[], placeName: string): boolean {
  const name = placeName.toLowerCase();
  const hasCafeType = placeTypes.includes('cafe');
  const hasRestaurantType = placeTypes.includes('restaurant');
  
  // If it's a restaurant, don't exclude it
  if (hasRestaurantType) return false;
  
  // If it's a cafe without restaurant type and matches coffee patterns
  if (hasCafeType && COFFEE_KEEP_PATTERNS.test(name)) {
    // But allow "café bistro" style names
    if (name.includes('bistro') || name.includes('kitchen') || name.includes('grill')) {
      return false;
    }
    return true;
  }
  
  return false;
}

export const googlePlacesProvider: PlacesProvider = {
  providerName: "google",
  isEnabled: !!GOOGLE_MAPS_API_KEY,
  
  async searchRestaurants(options: SearchOptions): Promise<ProviderPlace[]> {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('⚠️ Google Places API key not configured');
      return [];
    }
    
    const isCoffeeSearch = options.venueType === 'coffee';
    console.log(`🌍 Google provider: Searching ${isCoffeeSearch ? 'coffee shops' : 'restaurants'}`);
    
    // Map price level to Google's scale (1-4)
    const priceLevelMap: Record<string, { min: number; max: number }> = {
      'budget': { min: 1, max: 2 },
      'moderate': { min: 2, max: 3 },
      'upscale': { min: 3, max: 4 },
      'fine_dining': { min: 4, max: 4 }
    };
    
    const priceRange = options.priceLevel ? priceLevelMap[options.priceLevel] : null;
    
    // Build keyword based on venue type
    let enhancedKeyword: string;
    let searchType: string;
    
    if (isCoffeeSearch) {
      // Coffee-specific search
      enhancedKeyword = 'coffee shop';
      searchType = 'cafe';
    } else {
      // Regular restaurant search
      enhancedKeyword = options.cuisine === 'restaurant' || !options.cuisine 
        ? 'restaurant' 
        : `${options.cuisine} restaurant`;
        
      if (options.priceLevel === 'fine_dining') {
        enhancedKeyword = `luxury ${enhancedKeyword} fine dining michelin`;
      } else if (options.priceLevel === 'upscale') {
        enhancedKeyword = `upscale ${enhancedKeyword} fine dining`;
      } else if (options.priceLevel === 'budget') {
        enhancedKeyword = `affordable ${enhancedKeyword}`;
      }
      searchType = 'restaurant';
    }
    
    // Add city name for precision
    if (options.targetCity) {
      enhancedKeyword = `${enhancedKeyword} in ${options.targetCity}`;
    }
    
    // Build Google Places API request
    const placesUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
    placesUrl.searchParams.set('location', `${options.lat},${options.lng}`);
    placesUrl.searchParams.set('radius', options.radiusMeters.toString());
    placesUrl.searchParams.set('keyword', enhancedKeyword);
    placesUrl.searchParams.set('type', searchType);
    
    if (priceRange && !isCoffeeSearch) {
      placesUrl.searchParams.set('minprice', priceRange.min.toString());
      placesUrl.searchParams.set('maxprice', priceRange.max.toString());
    }
    
    placesUrl.searchParams.set('key', GOOGLE_MAPS_API_KEY);
    
    const response = await fetch(placesUrl.toString());
    const data = await response.json();
    
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status);
      throw new Error(`Google Places API error: ${data.status}`);
    }
    
    const dinnerTimeExclusion = !isCoffeeSearch && isDinnerTime(options.searchTime);
    
    const results = (data.results || [])
      .filter((place: any) => {
        const types = place.types || [];
        const name = place.name || '';
        
        if (isCoffeeSearch) {
          // === COFFEE SHOP FILTERING ===
          // KEEP: Must have cafe type OR match coffee patterns
          const hasCafeType = types.includes('cafe');
          const matchesCoffeePattern = COFFEE_KEEP_PATTERNS.test(name);
          
          // EXCLUDE: Boba/tea shops and Starbucks
          if (COFFEE_EXCLUDE_PATTERNS.test(name)) {
            console.log(`☕ Google: Filtering out "${name}" - boba/tea/starbucks excluded`);
            return false;
          }
          
          if (!hasCafeType && !matchesCoffeePattern) {
            console.log(`☕ Google: Filtering out "${name}" - not a coffee shop`);
            return false;
          }
          
          return true;
        } else {
          // === REGULAR RESTAURANT FILTERING ===
          // Exclude non-restaurants using centralized filtering
          if (shouldExcludeRestaurant(types, name)) {
            console.log(`🚫 Google: Filtering out "${name}" - excluded type/name`);
            return false;
          }
          
          // Dinner-time exclusion: remove pure coffee/cafe venues
          if (dinnerTimeExclusion && isPureCoffeeVenue(types, name)) {
            console.log(`🌙 Google: Filtering out "${name}" - pure coffee venue at dinner time`);
            return false;
          }
          
          // Apply price filtering
          if (!priceRange) return true;
          const placePrice = place.price_level || 2;
          return placePrice >= priceRange.min && placePrice <= priceRange.max;
        }
      })
      .map((place: any): ProviderPlace => {
        const placeLat = place.geometry?.location?.lat || 0;
        const placeLng = place.geometry?.location?.lng || 0;
        const distance = calculateDistance(options.lat, options.lng, placeLat, placeLng);
        
        return {
          id: place.place_id,
          name: place.name,
          address: place.vicinity || '',
          rating: place.rating || 0,
          priceLevel: place.price_level || null,
          lat: placeLat,
          lng: placeLng,
          source: "google",
          reviewCount: place.user_ratings_total || 0,
          photos: [],
          categories: place.types || [],
          distance: distance,
          // Keep these for compatibility with scoring functions
          types: place.types || [],
          addressComponents: place.address_components || [],
          geometry: place.geometry
        };
      });
    
    console.log(`✅ Google provider: Found ${results.length} ${isCoffeeSearch ? 'coffee shops' : 'restaurants'}`);
    return results;
  }
};
