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
  // Parks / nature (not date-night venues)
  'park', 'state_park', 'national_park', 'dog_park', 'playground',
  'campground', 'nature_reserve', 'hiking_area', 'trail',
  // Low-effort venues (not outings)
  'cafe', 'bakery',
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
  'restaurant', 'food', 'meal_takeaway', 'meal_delivery', 'bakery',
  // 'cafe' REMOVED - cafes only valid for coffee-specific searches
];

export const BAR_TYPES: string[] = [
  'bar', 'night_club', 'lounge',
];

// Boba/bubble tea shops — not dinner venues
export const BOBA_EXCLUSION_PATTERNS = /\bboba\b|\bbubble\s?tea\b|\bmilk\s?tea\b|\btapioca\b|\btea\s?shop\b|\btea\s?house\b|\bteahouse\b|\bpearl\s?tea\b/i;

export function isBobaVenue(name: string): boolean {
  return BOBA_EXCLUSION_PATTERNS.test(name);
}

// Production/management companies (not real venues)
export const NON_VENUE_KEYWORDS: string[] = [
  'production', 'productions', 'entertainment inc', 'entertainment llc',
  'entertainment group', 'event management', 'event planning', 'promotions',
  'booking agency', 'talent agency', 'media group', 'studios llc',
  'consulting', 'marketing agency', 'management company', 'staffing',
  // Catering-only businesses
  'catering', 'caterers',
];

// Restaurant keywords for activity exclusion
export const RESTAURANT_KEYWORDS: string[] = [
  'burger', 'pizza', 'taco', 'sushi', 'restaurant', 'grill', 'diner',
  'cafe', 'bakery', 'kitchen', 'eatery', 'food', 'wings', 'chicken',
  'bbq', 'barbecue', 'steakhouse', 'fatburger', 'in-n-out', 'mcdonalds',
  'five guys', 'shake shack', 'wendys', 'chick-fil-a', 'popeyes',
  'del taco', 'taco bell', 'chipotle', 'panda express', 'wingstop',
];

// ===== UPSCALE / FINE DINING QUALITY GATE =====
// For upscale/fine_dining requests, a venue MUST pass this positive signal check
// if it lacks confirmed price data. This replaces whack-a-mole blacklisting.

// Strong upscale signals in the venue name
export const UPSCALE_NAME_SIGNALS = /steakhouse|steak\s*house|chophouse|chop\s*house|brasserie|ristorante|trattoria|osteria|enoteca|maison|le\s+\w|la\s+\w|bistro|gastropub|supper\s*club|tasting\s*menu|omakase|chef.s\s*table|prix\s*fixe|rooftop\s*dining|sky\s*dining|penthouse|grille|fine\s*dining|upscale|gourmet|signature\s*kitchen|prime\s*steak|prime\s*chop|tavern\s*\d|oyster\s*bar|raw\s*bar|seafood\s*bar|izakaya|kaiseki|fondue|raclette|wine\s*bar|cocktail\s*lounge|members?\s*club/i;

// Known upscale chain keywords (always pass for upscale searches)
export const UPSCALE_CHAIN_NAMES = /mastro|ruth.?s\s*chris|capital\s*grille|morton.?s|fleming.?s|eddie\s*v|del\s*frisco|boa\s*steakhouse|nobu|spago|craft|melisse|providence|republique|n\/naka|vespertine|hayato|jordon|the\s*palm|smith\s*&\s*wollensky|fogo\s*de\s*chao|las\s*brisas|water\s*grill|the\s*ivy|bottega\s*louie|perino|perino.?s|peppone|four\s*seasons\s*restaurant|hotel\s*restaurant/i;

// Signals that a venue is clearly NOT upscale (instant fail for upscale searches)
export const NON_UPSCALE_SIGNALS = /boba|bubble\s*tea|milk\s*tea|tapioca|tea\s*shop|tea\s*house|teahouse|pearl\s*tea|catering|caterers|food\s*truck|buffet|all.?you.?can.?eat|smorgasbord|hot\s*dog|hot\s*dogs|deli\s*mart|deli\s*shop|fast\s*food|quick\s*bites|drive.?thru|drive.?through|wing\s*stop|wingstop|taco\s*bell|mcdonald|burger\s*king|subway\s*sandwich|pizza\s*hut|domino.?s|kfc|chipotle|panda\s*express|in.?n.?out|five\s*guys|shake\s*shack|chick.?fil|popeye|el\s*pollo|peet.?s\s*coffee|dunkin|starbucks|grocery|convenience|gas\s*station|market|bodega/i;

// Editorial summary keywords that signal an upscale venue
const UPSCALE_EDITORIAL_KEYWORDS = /upscale|elegant|refined|fine.?dining|sophisticated|luxurious|luxury|high.?end|award.?winning|michelin|celebrity|exclusive|intimate|curated|artisanal|craft\s+cocktail|world.?class|acclaimed|renowned|premier|signature|tasting.?menu|prix.?fixe|omakase/i;

/**
 * Determines if a venue qualifies as "upscale" for upscale/fine_dining searches.
 * Returns true = keep it (passes quality gate), false = reject it.
 *
 * Multi-dimensional logic using Google Places New API (v1) rich fields:
 * 1. INSTANT FAIL: NON_UPSCALE_SIGNALS in name
 * 2. INSTANT FAIL: confirmed priceLevel <= 2
 * 3. PASS: confirmed priceLevel >= 3
 * 4. PASS: primaryTypeDisplayName includes "Fine Dining"
 * 5. PASS: editorialSummary contains upscale keywords
 * 6. PASS: UPSCALE_CHAIN_NAMES match
 * 7. PASS: UPSCALE_NAME_SIGNALS match
 * 8. PASS: reservable=true AND rating>=4.3 AND reviewCount>=100 (high-trust proxy for real restaurant)
 * 9. DEFAULT REJECT: no positive signals
 */
export function passesUpscaleQualityGate(
  name: string,
  priceLevel: number | null | undefined,
  editorialSummary?: string,
  reservable?: boolean,
  primaryTypeDisplayName?: string,
  rating?: number,
  reviewCount?: number
): boolean {
  // RULE 1: Instant fail — clear non-upscale signals in name
  if (NON_UPSCALE_SIGNALS.test(name)) {
    return false;
  }

  // RULE 2: Instant fail — confirmed cheap price level
  if (priceLevel !== null && priceLevel !== undefined && priceLevel <= 2) {
    return false;
  }

  // RULE 3: Confirmed expensive price level — pass
  if (priceLevel !== null && priceLevel !== undefined && priceLevel >= 3) {
    return true;
  }

  // RULE 4: primaryTypeDisplayName contains "Fine Dining" — pass
  if (primaryTypeDisplayName && /fine.?dining/i.test(primaryTypeDisplayName)) {
    return true;
  }

  // RULE 5: Editorial summary contains upscale keywords — pass
  if (editorialSummary && UPSCALE_EDITORIAL_KEYWORDS.test(editorialSummary)) {
    return true;
  }

  // RULE 6: Known upscale chain — pass
  if (UPSCALE_CHAIN_NAMES.test(name)) {
    return true;
  }

  // RULE 7: Strong upscale signals in name — pass
  if (UPSCALE_NAME_SIGNALS.test(name)) {
    return true;
  }

  // RULE 8: Reservable + high rating + significant review count
  // Reservable venues with excellent ratings are almost always proper sit-down restaurants.
  // This catches "Nobu", "Carbone", "Matsuhisa" — brand-name places with no descriptor.
  if (
    reservable === true &&
    rating !== undefined && rating >= 4.3 &&
    reviewCount !== undefined && reviewCount >= 100
  ) {
    return true;
  }

  // DEFAULT: No positive signals — reject. Don't guess.
  return false;
}

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
