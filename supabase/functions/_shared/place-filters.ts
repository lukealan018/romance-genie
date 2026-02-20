// Centralized Place Filtering Configuration
// Single source of truth for all filtering logic

// ===== CHAIN CLASSIFICATIONS =====

export const FAST_FOOD_CHAINS: string[] = [
  // QSR / Fast Food
  'mcdonald', 'burger king', 'wendy', 'kfc', 'taco bell', 'subway',
  'jack in the box', 'carl\'s jr', 'hardee', 'arby', 'sonic', 'whataburger',
  'popeyes', 'wingstop', 'chick-fil-a', 'del taco', 'in-n-out', 'five guys',
  'shake shack', 'chipotle', 'panda express', 'el pollo loco',
  // Fast Casual
  'panera', 'jimmy john', 'jersey mike', 'blaze pizza', 'mod pizza', 'pieology',
  // Coffee Chains
  'starbucks', 'dunkin', 'coffee bean', 'peet\'s coffee',
];

export const CASUAL_CHAIN_RESTAURANTS: string[] = [
  // Sit-down Casual Dining
  'applebee', 'chili\'s', 'olive garden', 'red lobster', 'outback',
  'texas roadhouse', 'longhorn', 'cheesecake factory', 'yard house',
  'bj\'s restaurant', 'buffalo wild wings', 'hooters', 'twin peaks',
  'california pizza kitchen', 'pf chang', 'benihana', 'claim jumper',
  'red robin', 'cheddar', 'cracker barrel', 'denny\'s', 'ihop',
  // Regional Chains (California/West Coast)
  'lucille\'s', 'lazy dog', 'the habit', 'rubio', 'islands',
  // Bar/Nightlife Chains (entertainment venues)
  'dave & buster', 'punch bowl social',
];

export const FINE_DINING_CHAINS: string[] = [
  // Upscale Steakhouse Chains (should be ALLOWED for date nights)
  'capital grille', 'morton\'s', 'morton', 'ruth\'s chris', 'ruth chris',
  'fleming\'s', 'flemings', 'mastro\'s', 'mastro', 'eddie v',
  'seasons 52', 'houston\'s', 'del frisco', 'boa steakhouse',
  'stk', 'the palm', 'smith & wollensky', 'fogo de chao',
];

// ===== TYPE-BASED EXCLUSIONS =====

export const EXCLUDED_ALWAYS_TYPES: string[] = [
  // Never show as restaurants OR activities
  'school', 'university', 'cemetery', 'hospital', 'doctor', 'dentist',
  'pharmacy', 'funeral_home', 'church', 'post_office', 'courthouse',
  'police', 'fire_station', 'local_government_office', 'embassy',
  'veterinary_care', 'lawyer', 'accounting', 'insurance_agency',
];

export const EXCLUDED_RESTAURANT_TYPES: string[] = [
  // Never show as restaurants
  'grocery_store', 'supermarket', 'convenience_store', 'gas_station',
  'department_store', 'shopping_mall', 'drugstore', 'pet_store',
  'hardware_store', 'car_repair', 'car_wash', 'car_dealer',
  'liquor_store', 'home_goods_store', 'furniture_store',
];

export const EXCLUDED_ACTIVITY_TYPES: string[] = [
  // Never show as activities
  'store', 'department_store', 'clothing_store', 'electronics_store',
  'video_game_store', 'furniture_store', 'home_goods_store', 'shopping_mall',
  'grocery_store', 'supermarket', 'convenience_store', 'gas_station',
  'gym', 'laundry', 'parking', 'atm', 'bank', 'liquor_store',
  'beauty_salon', 'hair_care', 'spa', 'nail_salon', 'barber_shop',
];

// ===== GOLF ENTERTAINMENT FILTERING =====

export const ENTERTAINMENT_GOLF_ALLOWLIST: string[] = [
  'topgolf', 'top golf', 'driving range', 'golf entertainment',
  'night golf', 'glow golf', 'mini golf', 'putt putt', 'miniature golf',
  'golf simulator', 'indoor golf', 'golf lounge', 'puttshack',
];

export const TRADITIONAL_GOLF_EXCLUSIONS: string[] = [
  'golf course', 'country club', 'golf club', 'golf resort',
  'links', 'championship golf', '18 hole', '9 hole', 'golf & country',
  'golf and country', 'private club', 'members only',
];

// ===== RESTAURANT VS ACTIVITY SEPARATION =====

export const RESTAURANT_TYPES: string[] = [
  'restaurant', 'food', 'meal_takeaway', 'meal_delivery', 'bakery', 'cafe',
];

export const BAR_TYPES: string[] = [
  'bar', 'night_club', 'lounge',
];

// Production/management companies (not real venues)
export const NON_VENUE_KEYWORDS: string[] = [
  'production', 'productions', 'entertainment inc', 'entertainment llc',
  'entertainment group', 'event management', 'event planning', 'promotions',
  'booking agency', 'talent agency', 'media group', 'studios llc',
  'consulting', 'marketing agency', 'management company', 'staffing',
];

// Restaurant keywords for activity exclusion
export const RESTAURANT_KEYWORDS: string[] = [
  'burger', 'pizza', 'taco', 'sushi', 'restaurant', 'grill', 'diner',
  'cafe', 'bakery', 'kitchen', 'eatery', 'food', 'wings', 'chicken',
  'bbq', 'barbecue', 'steakhouse', 'fatburger', 'in-n-out', 'mcdonalds',
  'five guys', 'shake shack', 'wendys', 'chick-fil-a', 'popeyes',
  'del taco', 'taco bell', 'chipotle', 'panda express', 'wingstop',
];

// ===== ITALIAN vs PIZZA FILTERING =====
// When searching for "Italian", exclude pizza places unless user explicitly says "pizza"
export const PIZZA_KEYWORDS: string[] = [
  'pizza', 'pizzeria', "domino's", 'papa john', 'little caesars', 
  'round table', 'pizza hut', 'sbarro', 'pieology', 'blaze pizza', 
  'mod pizza', 'slice', 'pie', 'napoletana'
];

// True Italian restaurant indicators (non-pizza)
export const AUTHENTIC_ITALIAN_KEYWORDS: string[] = [
  'trattoria', 'ristorante', 'osteria', 'enoteca', 'italian restaurant',
  'italian bistro', 'italian kitchen', 'tuscan', 'northern italian',
  'southern italian', 'pasta', 'risotto', 'osso buco', 'carbonara'
];

export function isPizzaPlace(name: string): boolean {
  const nameLower = name.toLowerCase();
  return PIZZA_KEYWORDS.some(kw => nameLower.includes(kw));
}

export function isAuthenticItalian(name: string): boolean {
  const nameLower = name.toLowerCase();
  return AUTHENTIC_ITALIAN_KEYWORDS.some(kw => nameLower.includes(kw));
}

// ===== QUALITY FLOOR CONSTANTS =====

export const MIN_RATING_RESTAURANT = 3.5;
export const MIN_RATING_ACTIVITY = 3.5;
export const MIN_REVIEW_COUNT = 5;
export const MIN_REVIEW_COUNT_IF_NO_PHOTOS = 50;

// ===== HELPER FUNCTIONS =====

export function isFastFoodChain(name: string): boolean {
  const nameLower = name.toLowerCase().trim();
  return FAST_FOOD_CHAINS.some(chain => nameLower.includes(chain.toLowerCase()));
}

export function isCasualChain(name: string): boolean {
  const nameLower = name.toLowerCase().trim();
  return CASUAL_CHAIN_RESTAURANTS.some(chain => nameLower.includes(chain.toLowerCase()));
}

export function isFineDiningChain(name: string): boolean {
  const nameLower = name.toLowerCase().trim();
  return FINE_DINING_CHAINS.some(chain => nameLower.includes(chain.toLowerCase()));
}

export function isAnyChain(name: string): boolean {
  return isFastFoodChain(name) || isCasualChain(name) || isFineDiningChain(name);
}

export function hasExcludedType(types: string[], excludedTypes: string[]): boolean {
  return types.some(type => excludedTypes.includes(type.toLowerCase()));
}

export function isEntertainmentGolf(name: string): boolean {
  const nameLower = name.toLowerCase();
  return ENTERTAINMENT_GOLF_ALLOWLIST.some(kw => nameLower.includes(kw));
}

export function isTraditionalGolf(name: string, categories: string[] = []): boolean {
  const nameLower = name.toLowerCase();
  const categoryNames = categories.join(' ').toLowerCase();
  
  const excludedByName = TRADITIONAL_GOLF_EXCLUSIONS.some(kw => nameLower.includes(kw));
  const excludedByCategory = categoryNames.includes('golf course') || categoryNames.includes('country club');
  
  return excludedByName || excludedByCategory;
}

export function shouldExcludeAsTraditionalGolf(name: string, categories: string[] = []): boolean {
  // Allow entertainment golf, exclude traditional golf
  if (isEntertainmentGolf(name)) return false;
  return isTraditionalGolf(name, categories);
}

export function isPrimarilyRestaurant(types: string[]): boolean {
  const typesLower = types.map(t => t.toLowerCase());
  const hasRestaurantType = typesLower.some(t => RESTAURANT_TYPES.includes(t));
  const hasBarType = typesLower.some(t => BAR_TYPES.includes(t));
  // Is restaurant if has restaurant types but NOT primarily a bar
  return hasRestaurantType && !hasBarType;
}

export function isRestaurantByKeyword(name: string): boolean {
  const nameLower = name.toLowerCase();
  return RESTAURANT_KEYWORDS.some(kw => nameLower.includes(kw));
}

export function isNonVenueBusiness(name: string): boolean {
  const nameLower = name.toLowerCase();
  return NON_VENUE_KEYWORDS.some(kw => nameLower.includes(kw));
}

// ===== FOURSQUARE RETAIL/GROCERY EXCLUSIONS =====

export const FOURSQUARE_RETAIL_CATEGORY_PREFIXES: string[] = [
  '170',   // Retail (parent category)
  '171',   // Shopping Mall
  '172',   // Department Store
];

export const RETAIL_NAME_EXCLUSIONS: string[] = [
  // Grocery stores
  'trader joe', 'whole foods', 'vons', 'ralphs', 'safeway', 'kroger',
  'albertsons', 'publix', 'aldi', 'lidl', 'sprouts', 'food 4 less',
  'smart & final', 'grocery outlet', 'hmart', '99 ranch', 'gelson',
  // Big box / general retail
  'costco', 'walmart', 'target', 'sams club', 'sam\'s club', 'bjs wholesale',
  // Dollar/discount stores
  '99 cent', 'dollar tree', 'dollar general', 'family dollar', 'five below',
  // Drugstores
  'cvs', 'walgreens', 'rite aid',
  // Home improvement
  'home depot', 'lowes', 'lowe\'s', 'ace hardware',
  // Beauty/cosmetics retail
  'sephora', 'ulta beauty', 'mac cosmetics',
  // Other retail
  'best buy', 'staples', 'office depot', 'petco', 'petsmart', 'nordstrom',
  'bloomingdale', 'macy\'s', 'jcpenney', 'kohl\'s', 'ross dress', 'marshalls', 't.j. maxx',
];

export function isRetailPlaceByFoursquare(
  categories: { id: string; name?: string }[],
  name: string
): boolean {
  const nameLower = name.toLowerCase();

  // Category-based: any category whose id starts with a retail prefix
  const hasRetailCategory = categories.some((c) =>
    FOURSQUARE_RETAIL_CATEGORY_PREFIXES.some((prefix) => c.id?.startsWith(prefix))
  );
  if (hasRetailCategory) {
    return true;
  }

  // Name-based exclusions
  if (RETAIL_NAME_EXCLUSIONS.some((kw) => nameLower.includes(kw))) {
    return true;
  }

  return false;
}
