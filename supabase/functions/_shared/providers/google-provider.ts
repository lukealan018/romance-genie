import type { PlacesProvider, ProviderPlace, SearchOptions } from '../places-types.ts';
import {
  EXCLUDED_ALWAYS_TYPES,
  EXCLUDED_RESTAURANT_TYPES,
  hasExcludedType,
  isPizzaPlace,
  isAuthenticItalian,
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

// Coffee shop filtering patterns - STRICT: Must be primarily a coffee shop
// EXPANDED patterns to catch indie coffee shops
const COFFEE_KEEP_PATTERNS = /coffee|café|cafe|espresso|roasters|roastery|java|brew|roast|grind|bean|drip|pour.?over|latte|coffeehouse|coffee.?house|coffee.?spot|cold.?brew|cortado|cappuccino/i;
// EXPANDED exclusions for chains and non-coffee venues
const COFFEE_EXCLUDE_PATTERNS = /boba|bubble|milk tea|tapioca|tea shop|tea house|teahouse|starbucks|dunkin|peet's|peets|the coffee bean|coffee bean & tea|caribou|tim horton|tims|mccafe|mcdonalds|7-eleven/i;
// Exclude food-focused venues that happen to serve coffee
const COFFEE_EXCLUDE_FOOD_FOCUS = /sandwich|deli|bakery|bagel|pizza|burger|grill|bistro|kitchen|restaurant|diner|eatery|donut|doughnut|panera|au bon pain|corner bakery|la boulange|einstein/i;

// Check if it's dinner time (14:00 or later)
function isDinnerTime(searchTime?: string): boolean {
  if (!searchTime) return false;
  const [hours] = searchTime.split(':').map(Number);
  return hours >= 14;
}

// Restaurant filtering using centralized exclusion lists
function shouldExcludeRestaurant(placeTypes: string[], placeName: string = '', cuisine?: string): boolean {
  const name = placeName.toLowerCase();
  
  // PASS 0: Italian cuisine filter - exclude pizza places unless searching for pizza
  if (cuisine === 'italian') {
    // If it's a pizza place and NOT a full Italian restaurant, exclude it
    if (isPizzaPlace(name) && !isAuthenticItalian(name)) {
      console.log(`🍕 Filtering out "${placeName}" - pizza place from Italian search`);
      return true;
    }
    // Prioritize authentic Italian restaurants
    if (isAuthenticItalian(name)) {
      return false; // Keep authentic Italian regardless of other filters
    }
  }
  
  // PASS 1: Allowlist legitimate restaurants
  const restaurantKeywords = [
    'restaurant', 'bistro', 'cafe', 'steakhouse', 'trattoria', 
    'brasserie', 'eatery', 'dining', 'grill', 'kitchen', 
    'tavern', 'pub', 'diner', 'bar & grill', 'ristorante', 'osteria'
  ];
  
  // Note: removed 'pizzeria' from allowlist - it should be filtered for Italian searches
  
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
    const isBrunchSearch = options.venueType === 'brunch';
    console.log(`🌍 Google provider: Searching ${isCoffeeSearch ? 'coffee shops' : isBrunchSearch ? 'brunch spots' : 'restaurants'}`);
    
    // Map price level to Google's scale (1-4)
    // For strict filtering (when we have price data) - but DON'T exclude missing data
    const priceLevelStrictMin: Record<string, number> = {
      'budget': 1,      // Only $ acceptable with strict filter
      'moderate': 2,    // $$ strict minimum
      'upscale': 3,     // $$$ strict minimum
      'fine_dining': 4  // $$$$ strict minimum
    };
    
    // For relaxed filtering - keeps more results when data is sparse
    const priceLevelRelaxedMin: Record<string, number> = {
      'budget': 1,
      'moderate': 2,
      'upscale': 2,     // Relax to $$ as minimum, boost $$$ in sorting
      'fine_dining': 3  // Relax to $$$ as minimum, boost $$$$ in sorting
    };
    
    // Get minimum acceptable prices for filtering
    const strictMinPrice = options.priceLevel ? priceLevelStrictMin[options.priceLevel] : null;
    const relaxedMinPrice = options.priceLevel ? priceLevelRelaxedMin[options.priceLevel] : null;
    
    // Only apply API-level price filter for budget (to limit results)
    // For upscale/fine_dining, use keywords instead - more reliable
    const priceRange = (options.priceLevel === 'budget') 
      ? { min: 1, max: 2 } 
      : null; // Don't use API price filter for upscale - it misses too many venues
    
    // Build keyword based on venue type
    let enhancedKeyword: string;
    let searchType: string;
    
    if (isCoffeeSearch) {
      // Coffee-specific search
      enhancedKeyword = 'coffee shop';
      searchType = 'cafe';
    } else if (isBrunchSearch) {
      // Brunch-specific search
      enhancedKeyword = 'brunch breakfast restaurant';
      searchType = 'restaurant';
    } else {
      // Regular restaurant search
      enhancedKeyword = options.cuisine === 'restaurant' || !options.cuisine 
        ? 'restaurant' 
        : `${options.cuisine} restaurant`;
      
      // IMPORTANT: Italian != Pizza - add "authentic" and exclude pizza keywords
      if (options.cuisine === 'italian') {
        enhancedKeyword = 'italian restaurant trattoria osteria ristorante -pizza -pizzeria';
      }
        
      // ENHANCED LUXURY KEYWORDS - Comprehensive high-end restaurant terms
      // Primary search uses strongest signals, fallback uses alternative terms
      if (options.priceLevel === 'fine_dining') {
        // Primary: Michelin + tasting menu focused
        enhancedKeyword = `${enhancedKeyword} Michelin star fine dining tasting menu chef's table gourmet culinary experience award winning`;
      } else if (options.priceLevel === 'upscale') {
        // Upscale: Elegant + refined + prix fixe
        enhancedKeyword = `${enhancedKeyword} upscale elegant refined prix fixe signature menu sophisticated gourmet`;
      } else if (options.priceLevel === 'budget') {
        enhancedKeyword = `affordable ${enhancedKeyword}`;
      } else if (!options.priceLevel) {
        // DEFAULT: Date night concierge bias toward quality
        enhancedKeyword = `${enhancedKeyword} best rated`;
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
          // === STRICT COFFEE SHOP FILTERING ===
          // KEEP: Must match coffee patterns (not just cafe type)
          const matchesCoffeePattern = COFFEE_KEEP_PATTERNS.test(name);
          
          // EXCLUDE: Boba/tea shops and chains
          if (COFFEE_EXCLUDE_PATTERNS.test(name)) {
            console.log(`☕ Google: Filtering out "${name}" - boba/tea/chain excluded`);
            return false;
          }
          
          // EXCLUDE: Food-focused venues that happen to serve coffee
          if (COFFEE_EXCLUDE_FOOD_FOCUS.test(name)) {
            console.log(`☕ Google: Filtering out "${name}" - food-focused venue`);
            return false;
          }
          
          // MUST match coffee pattern (not just be a cafe)
          if (!matchesCoffeePattern) {
            console.log(`☕ Google: Filtering out "${name}" - name doesn't indicate coffee shop`);
            return false;
          }
          
          return true;
        } else {
          // === REGULAR RESTAURANT FILTERING ===
          // Exclude non-restaurants using centralized filtering
          // Pass cuisine to enable Italian vs Pizza filtering
          if (shouldExcludeRestaurant(types, name, options.cuisine)) {
            console.log(`🚫 Google: Filtering out "${name}" - excluded type/name`);
            return false;
          }
          
          // Dinner-time exclusion: remove pure coffee/cafe venues
          if (dinnerTimeExclusion && isPureCoffeeVenue(types, name)) {
            console.log(`🌙 Google: Filtering out "${name}" - pure coffee venue at dinner time`);
            return false;
          }
          
          // === RELAXED PRICE LEVEL FILTERING ===
          // For upscale/fine_dining: DON'T exclude venues without price data
          // Many high-end restaurants don't have price_level set in Google
          const placePrice = place.price_level;
          
          if (relaxedMinPrice !== null) {
            // ONLY filter out venues that HAVE price data and are too cheap
            if (placePrice !== undefined && placePrice !== null && placePrice < relaxedMinPrice) {
              console.log(`💰 Google: Filtering out "${name}" - price level ${placePrice} < relaxed min ${relaxedMinPrice} for ${options.priceLevel}`);
              return false;
            }
            // Venues without price data are KEPT - they'll be sorted later
          }
          
          return true;
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
