import type { PlacesProvider, ProviderPlace, SearchOptions } from '../places-types.ts';
import {
  EXCLUDED_ALWAYS_TYPES,
  EXCLUDED_RESTAURANT_TYPES,
  hasExcludedType,
  isPizzaPlace,
  isAuthenticItalian,
  passesUpscaleQualityGate,
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
function shouldExcludeRestaurant(placeTypes: string[], placeName: string = '', cuisine?: string, isCoffeeSearch: boolean = false): boolean {
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
    'restaurant', 'bistro', 'steakhouse', 'trattoria', 
    'brasserie', 'eatery', 'dining', 'grill', 'kitchen', 
    'tavern', 'pub', 'diner', 'bar & grill', 'ristorante', 'osteria'
    // 'cafe' REMOVED -- only valid when venueType === 'coffee'
  ];
  
  if (restaurantKeywords.some(keyword => name.includes(keyword))) {
    return false;
  }
  
  // Block cafe/coffee venues from non-coffee searches (by name OR by Google types)
  if (!isCoffeeSearch) {
    const cafePatterns = /\bcafe\b|\bcafé\b|\bcoffee\b|\bespresso\b|\broasters?\b|\bcoffeehouse\b/i;
    if (cafePatterns.test(name) && !name.includes('bistro') && !name.includes('kitchen') && !name.includes('grill')) {
      console.log(`☕🚫 Google: Filtering out "${placeName}" - cafe/coffee venue in non-coffee search`);
      return true;
    }
    // Also check Google types: places with 'cafe' or 'coffee_shop' type but NOT 'restaurant' type
    // are pure coffee/cafe venues (e.g., "Annie's Table" = Coffee.Boba.Catering)
    const hasCafeType = placeTypes.some(t => t === 'cafe' || t === 'coffee_shop');
    const hasRestaurantType = placeTypes.includes('restaurant');
    if (hasCafeType && !hasRestaurantType && !name.includes('bistro') && !name.includes('kitchen') && !name.includes('grill')) {
      console.log(`☕🚫 Google: Filtering out "${placeName}" - cafe/coffee_shop type without restaurant type`);
      return true;
    }
  }
  
  // Block boba/bubble tea/milk tea venues from all restaurant searches
  // These are NOT dinner venues and should never appear in date night recommendations
  const bobaPatterns = /\bboba\b|\bbubble\s?tea\b|\bmilk\s?tea\b|\btapioca\b|\btea\s?shop\b|\btea\s?house\b|\bteahouse\b|\bpearl\s?tea\b/i;
  if (bobaPatterns.test(name)) {
    console.log(`🧋🚫 Google: Filtering out "${placeName}" - boba/bubble tea venue not suitable for dinner`);
    return true;
  }
  
  // Block catering companies and non-restaurant businesses
  const cateringPatterns = /\bcatering\b|\bcaterer\b/i;
  if (cateringPatterns.test(name) && !name.match(/\brestaurant\b|\bbistro\b|\bkitchen\b/i)) {
    console.log(`🚫 Google: Filtering out "${placeName}" - catering company not a dine-in venue`);
    return true;
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
    
    // Price level maps (Google scale 1–4)
    const relaxedMinPrice: Record<string, number> = {
      'budget': 1,
      'moderate': 2,
      // upscale/fine_dining handled by passesUpscaleQualityGate() — not here
    };
    const relaxedMin = options.priceLevel && relaxedMinPrice[options.priceLevel] != null
      ? relaxedMinPrice[options.priceLevel]
      : null;
    
    // Only apply API-level price filter for budget (to limit results from Google)
    const priceRange = (options.priceLevel === 'budget') 
      ? { min: 1, max: 2 } 
      : null;
    
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
    
    // Add city name for precision — include in text search
    const textQuery = options.targetCity
      ? `${enhancedKeyword} in ${options.targetCity}`
      : enhancedKeyword;

    // === Google Places New API (v1) — places:searchText ===
    // searchText supports textQuery + locationBias + includedType + priceLevels
    // Returns richer data: editorialSummary, reservable, primaryTypeDisplayName, priceLevel (more consistent)
    // NOTE: searchNearby does NOT support textQuery — searchText does and is the correct endpoint
    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.rating',
      'places.userRatingCount',
      'places.priceLevel',
      'places.location',
      'places.types',
      'places.photos',
      'places.editorialSummary',
      'places.reservable',
      'places.primaryTypeDisplayName',
      'places.servesWine',
      'places.servesCocktails',
      'places.takeout',
      'places.addressComponents',
      'places.regularOpeningHours',
    ].join(',');

    // Map price tiers to New API priceLevels array (supported by searchText)
    const includedPriceLevels: string[] = [];
    if (options.priceLevel === 'budget') {
      includedPriceLevels.push('PRICE_LEVEL_INEXPENSIVE');
    } else if (options.priceLevel === 'fine_dining') {
      includedPriceLevels.push('PRICE_LEVEL_VERY_EXPENSIVE', 'PRICE_LEVEL_EXPENSIVE');
    } else if (options.priceLevel === 'upscale') {
      // Upscale = expensive or very expensive only (not moderate)
      includedPriceLevels.push('PRICE_LEVEL_VERY_EXPENSIVE', 'PRICE_LEVEL_EXPENSIVE');
    }

    // searchText request body
    const requestBody: Record<string, any> = {
      textQuery,
      locationBias: {
        circle: {
          center: { latitude: options.lat, longitude: options.lng },
          radius: options.radiusMeters,
        },
      },
      maxResultCount: 20,
      languageCode: 'en',
    };

    // Add included type (searchText uses includedType singular, not array)
    if (isCoffeeSearch) {
      requestBody.includedType = 'cafe';
    } else {
      requestBody.includedType = 'restaurant';
    }

    if (includedPriceLevels.length > 0) {
      requestBody.priceLevels = includedPriceLevels;
    }

    const response = await fetch(
      'https://places.googleapis.com/v1/places:searchText',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
          'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify(requestBody),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('Google Places New API error:', data.error);
      throw new Error(`Google Places API error: ${data.error.message}`);
    }

    const dinnerTimeExclusion = !isCoffeeSearch && isDinnerTime(options.searchTime);

    // New API price level string → number mapping
    const priceLevelMap: Record<string, number> = {
      PRICE_LEVEL_FREE: 0,
      PRICE_LEVEL_INEXPENSIVE: 1,
      PRICE_LEVEL_MODERATE: 2,
      PRICE_LEVEL_EXPENSIVE: 3,
      PRICE_LEVEL_VERY_EXPENSIVE: 4,
    };

    const results = (data.places || [])
      .filter((place: any) => {
        const types = place.types || [];
        const name = place.displayName?.text || '';
        const priceLevelStr: string | undefined = place.priceLevel;
        const priceNum = priceLevelStr ? (priceLevelMap[priceLevelStr] ?? null) : null;
        const editorialSummary: string | undefined = place.editorialSummary?.text;
        const primaryTypeDisplayName: string | undefined = place.primaryTypeDisplayName?.text;
        const reservable: boolean | undefined = place.reservable;
        const rating: number | undefined = place.rating;
        const reviewCount: number | undefined = place.userRatingCount;

        if (isCoffeeSearch) {
          // === STRICT COFFEE SHOP FILTERING ===
          if (COFFEE_EXCLUDE_PATTERNS.test(name)) {
            console.log(`☕ Google: Filtering out "${name}" - boba/tea/chain excluded`);
            return false;
          }
          if (COFFEE_EXCLUDE_FOOD_FOCUS.test(name)) {
            console.log(`☕ Google: Filtering out "${name}" - food-focused venue`);
            return false;
          }
          if (!COFFEE_KEEP_PATTERNS.test(name)) {
            console.log(`☕ Google: Filtering out "${name}" - name doesn't indicate coffee shop`);
            return false;
          }
          return true;
        } else {
          // === REGULAR RESTAURANT FILTERING ===
          if (shouldExcludeRestaurant(types, name, options.cuisine, isCoffeeSearch)) {
            console.log(`🚫 Google: Filtering out "${name}" - excluded type/name`);
            return false;
          }

          if (dinnerTimeExclusion && isPureCoffeeVenue(types, name)) {
            console.log(`🌙 Google: Filtering out "${name}" - pure coffee venue at dinner time`);
            return false;
          }

          // === UPSCALE / FINE DINING QUALITY GATE (multi-dimensional) ===
          const isUpscaleSearch = options.priceLevel === 'upscale' || options.priceLevel === 'fine_dining';

          if (isUpscaleSearch) {
            const passes = passesUpscaleQualityGate(
              name,
              priceNum,
              editorialSummary,
              reservable,
              primaryTypeDisplayName,
              rating,
              reviewCount
            );
            if (!passes) {
              console.log(`💎🚫 Google: Rejecting "${name}" (price=${priceLevelStr ?? 'none'}, reservable=${reservable}, rating=${rating}) - failed upscale gate`);
              return false;
            } else {
              console.log(`💎✅ Google: Keeping "${name}" (price=${priceLevelStr ?? 'none'}, reservable=${reservable}, editorial="${editorialSummary?.slice(0, 50) ?? 'none'}")`);
            }
          } else if (relaxedMin !== null) {
            if (priceNum !== null && priceNum < relaxedMin) {
              console.log(`💰 Google: Filtering out "${name}" - price level ${priceNum} < min ${relaxedMin}`);
              return false;
            }
          }

          return true;
        }
      })
      .map((place: any): ProviderPlace => {
        const placeLat = place.location?.latitude || 0;
        const placeLng = place.location?.longitude || 0;
        const distance = calculateDistance(options.lat, options.lng, placeLat, placeLng);
        const priceLevelStr: string | undefined = place.priceLevel;
        const priceNum = priceLevelStr ? (priceLevelMap[priceLevelStr] ?? null) : null;

        // Extract photo references (New API uses different format)
        const photos = (place.photos || [])
          .slice(0, 5)
          .map((p: any) => p.name || '');

        return {
          id: place.id,
          name: place.displayName?.text || '',
          address: place.formattedAddress || '',
          rating: place.rating || 0,
          priceLevel: priceNum,
          lat: placeLat,
          lng: placeLng,
          source: "google",
          reviewCount: place.userRatingCount || 0,
          photos,
          categories: place.types || [],
          distance,
          // Compatibility fields
          types: place.types || [],
          addressComponents: place.addressComponents || [],
          geometry: { location: { lat: placeLat, lng: placeLng } },
          // Rich fields from New API — feed into upscale quality gate
          editorialSummary: place.editorialSummary?.text,
          reservable: place.reservable,
          primaryTypeDisplayName: place.primaryTypeDisplayName?.text,
          servesWine: place.servesWine,
          servesCocktails: place.servesCocktails,
        };
      });

    console.log(`✅ Google provider (New API): Found ${results.length} ${isCoffeeSearch ? 'coffee shops' : 'restaurants'}`);
    return results;
  }
};
