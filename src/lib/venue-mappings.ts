// Comprehensive venue type mappings for accurate search results

export interface VenueMapping {
  googleType: string;
  keywords: string[];
  cuisine?: string;
  priceLevel?: 'budget' | 'moderate' | 'upscale';
}

// Restaurant mappings (80+ types)
export const restaurantMappings: Record<string, VenueMapping> = {
  // American
  'steakhouse': { googleType: 'restaurant', keywords: ['steakhouse', 'steak house', 'prime beef'], cuisine: 'american' },
  'burger joint': { googleType: 'restaurant', keywords: ['burger', 'burger joint', 'hamburger', 'gourmet burger'], cuisine: 'american' },
  'burger': { googleType: 'restaurant', keywords: ['burger', 'hamburger', 'burger bar'], cuisine: 'american' },
  'bbq': { googleType: 'restaurant', keywords: ['bbq', 'barbecue', 'smokehouse', 'brisket', 'ribs'], cuisine: 'american' },
  'barbecue': { googleType: 'restaurant', keywords: ['barbecue', 'bbq', 'smokehouse', 'smoked meat'], cuisine: 'american' },
  'diner': { googleType: 'restaurant', keywords: ['diner', 'breakfast spot', 'brunch', 'classic diner'], cuisine: 'american' },
  'southern': { googleType: 'restaurant', keywords: ['southern food', 'soul food', 'comfort food', 'fried chicken'], cuisine: 'american' },
  'soul food': { googleType: 'restaurant', keywords: ['soul food', 'southern food', 'comfort food'], cuisine: 'american' },
  'cajun': { googleType: 'restaurant', keywords: ['cajun', 'creole', 'louisiana', 'gumbo'], cuisine: 'american' },
  'tex-mex': { googleType: 'restaurant', keywords: ['tex-mex', 'texmex', 'fajitas', 'queso'], cuisine: 'american' },
  
  // Asian - Japanese
  'sushi': { googleType: 'restaurant', keywords: ['sushi', 'sashimi', 'nigiri', 'maki'], cuisine: 'japanese' },
  'omakase': { googleType: 'restaurant', keywords: ['omakase', 'sushi omakase', 'chef choice sushi'], cuisine: 'japanese', priceLevel: 'upscale' },
  'ramen': { googleType: 'restaurant', keywords: ['ramen', 'noodle shop', 'tonkotsu', 'ramen house'], cuisine: 'japanese' },
  'izakaya': { googleType: 'restaurant', keywords: ['izakaya', 'japanese pub', 'yakitori'], cuisine: 'japanese' },
  'japanese': { googleType: 'restaurant', keywords: ['japanese', 'japanese restaurant'], cuisine: 'japanese' },
  'teppanyaki': { googleType: 'restaurant', keywords: ['teppanyaki', 'hibachi', 'japanese grill'], cuisine: 'japanese' },
  'udon': { googleType: 'restaurant', keywords: ['udon', 'udon noodles', 'japanese noodles'], cuisine: 'japanese' },
  
  // Asian - Chinese
  'dim sum': { googleType: 'restaurant', keywords: ['dim sum', 'yum cha', 'chinese tea house', 'dumplings'], cuisine: 'chinese' },
  'hot pot': { googleType: 'restaurant', keywords: ['hot pot', 'hotpot', 'shabu shabu'], cuisine: 'chinese' },
  'chinese': { googleType: 'restaurant', keywords: ['chinese', 'chinese restaurant'], cuisine: 'chinese' },
  'szechuan': { googleType: 'restaurant', keywords: ['szechuan', 'sichuan', 'spicy chinese'], cuisine: 'chinese' },
  'cantonese': { googleType: 'restaurant', keywords: ['cantonese', 'hong kong style'], cuisine: 'chinese' },
  
  // Asian - Korean
  'korean bbq': { googleType: 'restaurant', keywords: ['korean bbq', 'kbbq', 'korean grill', 'samgyeopsal'], cuisine: 'korean' },
  'korean': { googleType: 'restaurant', keywords: ['korean', 'korean restaurant', 'bibimbap'], cuisine: 'korean' },
  
  // Asian - Thai & Vietnamese
  'thai': { googleType: 'restaurant', keywords: ['thai', 'pad thai', 'thai curry', 'tom yum'], cuisine: 'thai' },
  'vietnamese': { googleType: 'restaurant', keywords: ['vietnamese', 'pho', 'banh mi', 'vietnamese restaurant'], cuisine: 'vietnamese' },
  'pho': { googleType: 'restaurant', keywords: ['pho', 'vietnamese noodles', 'pho restaurant'], cuisine: 'vietnamese' },
  
  // Asian - Other
  'indian': { googleType: 'restaurant', keywords: ['indian', 'curry', 'tandoori', 'biryani', 'masala'], cuisine: 'indian' },
  'filipino': { googleType: 'restaurant', keywords: ['filipino', 'philippine', 'adobo'], cuisine: 'filipino' },
  'indonesian': { googleType: 'restaurant', keywords: ['indonesian', 'nasi goreng', 'satay'], cuisine: 'indonesian' },
  
  // European - Italian
  'italian': { googleType: 'restaurant', keywords: ['italian', 'pasta', 'italian restaurant'], cuisine: 'italian' },
  'pizza': { googleType: 'restaurant', keywords: ['pizza', 'pizzeria', 'neapolitan pizza', 'pizza restaurant'], cuisine: 'italian' },
  'trattoria': { googleType: 'restaurant', keywords: ['trattoria', 'osteria', 'italian bistro'], cuisine: 'italian' },
  
  // European - French
  'french': { googleType: 'restaurant', keywords: ['french', 'french restaurant'], cuisine: 'french' },
  'bistro': { googleType: 'restaurant', keywords: ['bistro', 'french bistro', 'brasserie'], cuisine: 'french' },
  'brasserie': { googleType: 'restaurant', keywords: ['brasserie', 'french brasserie'], cuisine: 'french' },
  
  // European - Other
  'spanish': { googleType: 'restaurant', keywords: ['spanish', 'tapas', 'paella', 'spanish restaurant'], cuisine: 'spanish' },
  'tapas': { googleType: 'restaurant', keywords: ['tapas', 'spanish tapas', 'pintxos'], cuisine: 'spanish' },
  'greek': { googleType: 'restaurant', keywords: ['greek', 'mediterranean', 'gyro', 'souvlaki'], cuisine: 'greek' },
  'mediterranean': { googleType: 'restaurant', keywords: ['mediterranean', 'greek', 'middle eastern'], cuisine: 'mediterranean' },
  'german': { googleType: 'restaurant', keywords: ['german', 'german beer hall', 'schnitzel'], cuisine: 'german' },
  'turkish': { googleType: 'restaurant', keywords: ['turkish', 'kebab', 'turkish restaurant'], cuisine: 'turkish' },
  
  // Latin American
  'mexican': { googleType: 'restaurant', keywords: ['mexican', 'mexican restaurant'], cuisine: 'mexican' },
  'tacos': { googleType: 'restaurant', keywords: ['tacos', 'taco shop', 'taqueria'], cuisine: 'mexican' },
  'taqueria': { googleType: 'restaurant', keywords: ['taqueria', 'tacos', 'mexican street food'], cuisine: 'mexican' },
  'burrito': { googleType: 'restaurant', keywords: ['burrito', 'burrito bowl', 'mexican fast casual'], cuisine: 'mexican' },
  'brazilian': { googleType: 'restaurant', keywords: ['brazilian', 'brazilian steakhouse', 'churrascaria'], cuisine: 'brazilian' },
  'peruvian': { googleType: 'restaurant', keywords: ['peruvian', 'ceviche', 'peruvian restaurant'], cuisine: 'peruvian' },
  'cuban': { googleType: 'restaurant', keywords: ['cuban', 'cuban sandwich', 'cuban restaurant'], cuisine: 'cuban' },
  
  // Middle Eastern & African
  'middle eastern': { googleType: 'restaurant', keywords: ['middle eastern', 'lebanese', 'mediterranean'], cuisine: 'middle_eastern' },
  'lebanese': { googleType: 'restaurant', keywords: ['lebanese', 'shawarma', 'falafel', 'middle eastern'], cuisine: 'middle_eastern' },
  'shawarma': { googleType: 'restaurant', keywords: ['shawarma', 'middle eastern', 'kebab'], cuisine: 'middle_eastern' },
  'falafel': { googleType: 'restaurant', keywords: ['falafel', 'middle eastern', 'mediterranean'], cuisine: 'middle_eastern' },
  'ethiopian': { googleType: 'restaurant', keywords: ['ethiopian', 'injera', 'ethiopian restaurant'], cuisine: 'ethiopian' },
  'moroccan': { googleType: 'restaurant', keywords: ['moroccan', 'tagine', 'moroccan restaurant'], cuisine: 'moroccan' },
  
  // Seafood
  'seafood': { googleType: 'restaurant', keywords: ['seafood', 'fish', 'seafood restaurant'], cuisine: 'seafood' },
  'oyster bar': { googleType: 'restaurant', keywords: ['oyster bar', 'raw bar', 'oysters'], cuisine: 'seafood' },
  'raw bar': { googleType: 'restaurant', keywords: ['raw bar', 'oyster bar', 'shellfish'], cuisine: 'seafood' },
  'lobster': { googleType: 'restaurant', keywords: ['lobster', 'lobster shack', 'seafood'], cuisine: 'seafood' },
  'crab': { googleType: 'restaurant', keywords: ['crab', 'crab house', 'seafood boil'], cuisine: 'seafood' },
  'poke': { googleType: 'restaurant', keywords: ['poke', 'poke bowl', 'hawaiian'], cuisine: 'seafood' },
  
  // Dietary & Health
  'vegan': { googleType: 'restaurant', keywords: ['vegan', 'plant based', 'vegan restaurant'], cuisine: 'healthy' },
  'vegetarian': { googleType: 'restaurant', keywords: ['vegetarian', 'veggie', 'vegetarian restaurant'], cuisine: 'healthy' },
  'healthy': { googleType: 'restaurant', keywords: ['healthy', 'organic', 'clean eating'], cuisine: 'healthy' },
  'salad': { googleType: 'restaurant', keywords: ['salad', 'salad bar', 'fresh salads'], cuisine: 'healthy' },
  
  // Styles & Formats
  'fine dining': { googleType: 'restaurant', keywords: ['fine dining', 'michelin', 'tasting menu', 'upscale'], priceLevel: 'upscale' },
  'tasting menu': { googleType: 'restaurant', keywords: ['tasting menu', 'chef menu', 'prix fixe'], priceLevel: 'upscale' },
  'gastropub': { googleType: 'restaurant', keywords: ['gastropub', 'gastro pub', 'elevated pub food'], cuisine: 'american' },
  'food hall': { googleType: 'restaurant', keywords: ['food hall', 'food court', 'market hall'], cuisine: 'various' },
  'buffet': { googleType: 'restaurant', keywords: ['buffet', 'all you can eat'], cuisine: 'various' },
  'brunch': { googleType: 'restaurant', keywords: ['brunch', 'breakfast', 'brunch spot'], cuisine: 'american' },
  'breakfast': { googleType: 'restaurant', keywords: ['breakfast', 'brunch', 'morning food'], cuisine: 'american' },
  
  // Casual & Quick
  'cafe': { googleType: 'cafe', keywords: ['cafe', 'coffee shop', 'coffeehouse'], cuisine: 'cafe' },
  'coffee shop': { googleType: 'cafe', keywords: ['coffee shop', 'cafe', 'espresso bar'], cuisine: 'cafe' },
  'bakery': { googleType: 'bakery', keywords: ['bakery', 'patisserie', 'pastry shop'], cuisine: 'bakery' },
  'sandwich': { googleType: 'restaurant', keywords: ['sandwich', 'sandwich shop', 'deli'], cuisine: 'american' },
  'deli': { googleType: 'restaurant', keywords: ['deli', 'delicatessen', 'sandwich'], cuisine: 'american' },
  'food truck': { googleType: 'restaurant', keywords: ['food truck', 'street food', 'mobile food'], cuisine: 'various' },
};

// Bar & Lounge mappings (50+ types)
export const barMappings: Record<string, VenueMapping> = {
  // Bars - Specialty
  'whiskey bar': { googleType: 'bar', keywords: ['whiskey bar', 'whisky bar', 'bourbon bar', 'scotch bar'] },
  'cocktail bar': { googleType: 'bar', keywords: ['cocktail bar', 'mixology', 'craft cocktails', 'cocktail lounge'] },
  'wine bar': { googleType: 'bar', keywords: ['wine bar', 'wine lounge', 'vino bar', 'wine tasting'] },
  'speakeasy': { googleType: 'bar', keywords: ['speakeasy', 'hidden bar', 'secret bar', 'prohibition bar'] },
  'tiki bar': { googleType: 'bar', keywords: ['tiki bar', 'tropical bar', 'rum bar', 'polynesian bar'] },
  'gin bar': { googleType: 'bar', keywords: ['gin bar', 'gin joint', 'gin cocktails'] },
  'rum bar': { googleType: 'bar', keywords: ['rum bar', 'caribbean bar', 'rum cocktails'] },
  'sake bar': { googleType: 'bar', keywords: ['sake bar', 'japanese bar', 'sake tasting'] },
  'champagne bar': { googleType: 'bar', keywords: ['champagne bar', 'sparkling wine', 'champagne lounge'] },
  
  // Bars - Style & Atmosphere
  'sports bar': { googleType: 'bar', keywords: ['sports bar', 'sports pub', 'game bar', 'sports viewing'] },
  'dive bar': { googleType: 'bar', keywords: ['dive bar', 'local bar', 'neighborhood bar', 'casual bar'] },
  'rooftop bar': { googleType: 'bar', keywords: ['rooftop bar', 'rooftop lounge', 'sky bar', 'rooftop deck'] },
  'beach bar': { googleType: 'bar', keywords: ['beach bar', 'tiki bar', 'oceanfront bar', 'waterfront bar'] },
  'hotel bar': { googleType: 'bar', keywords: ['hotel bar', 'hotel lounge', 'lobby bar'] },
  'piano bar': { googleType: 'bar', keywords: ['piano bar', 'dueling pianos', 'live piano'] },
  'cigar bar': { googleType: 'bar', keywords: ['cigar bar', 'cigar lounge', 'smoking lounge'] },
  
  // Bars - Beer & Brewing
  'beer garden': { googleType: 'bar', keywords: ['beer garden', 'biergarten', 'outdoor bar', 'beer hall'] },
  'brewery': { googleType: 'bar', keywords: ['brewery', 'brewpub', 'craft brewery', 'microbrewery', 'taproom'] },
  'brewpub': { googleType: 'bar', keywords: ['brewpub', 'brewery pub', 'craft beer restaurant'] },
  'taproom': { googleType: 'bar', keywords: ['taproom', 'tasting room', 'brewery taproom'] },
  'beer bar': { googleType: 'bar', keywords: ['beer bar', 'craft beer', 'beer selection'] },
  
  // Pubs
  'pub': { googleType: 'bar', keywords: ['pub', 'public house', 'tavern'] },
  'irish pub': { googleType: 'bar', keywords: ['irish pub', 'irish bar', 'celtic pub'] },
  'english pub': { googleType: 'bar', keywords: ['english pub', 'british pub', 'uk pub'] },
  'gastropub': { googleType: 'bar', keywords: ['gastropub', 'gastro pub', 'upscale pub'] },
  
  // Lounges
  'lounge': { googleType: 'bar', keywords: ['lounge', 'cocktail lounge', 'upscale lounge'] },
  'lounge bar': { googleType: 'bar', keywords: ['lounge bar', 'cocktail lounge', 'upscale bar'] },
  'jazz lounge': { googleType: 'bar', keywords: ['jazz lounge', 'jazz bar', 'jazz club', 'live jazz'] },
  'hookah lounge': { googleType: 'bar', keywords: ['hookah lounge', 'shisha bar', 'hookah bar', 'hookah cafe'] },
  'cocktail lounge': { googleType: 'bar', keywords: ['cocktail lounge', 'upscale lounge', 'craft cocktails'] },
  
  // Nightlife & Entertainment
  'nightclub': { googleType: 'night_club', keywords: ['nightclub', 'club', 'dance club', 'night club'] },
  'dance club': { googleType: 'night_club', keywords: ['dance club', 'nightclub', 'dancing', 'dj'] },
  'live music venue': { googleType: 'night_club', keywords: ['live music', 'music venue', 'concert venue', 'live bands'] },
  'karaoke bar': { googleType: 'night_club', keywords: ['karaoke bar', 'karaoke', 'sing along', 'karaoke lounge'] },
  'comedy club': { googleType: 'night_club', keywords: ['comedy club', 'comedy show', 'stand up comedy', 'improv'] },
  
  // General
  'bar': { googleType: 'bar', keywords: ['bar', 'tavern', 'watering hole'] },
};

// Activity mappings (60+ types)
export const activityMappings: Record<string, VenueMapping> = {
  // Entertainment - Shows & Performance
  'comedy club': { googleType: 'night_club', keywords: ['comedy club', 'comedy show', 'stand up comedy', 'improv comedy'] },
  'comedy show': { googleType: 'night_club', keywords: ['comedy show', 'comedy club', 'stand up'] },
  'karaoke': { googleType: 'night_club', keywords: ['karaoke', 'karaoke bar', 'sing along', 'karaoke room'] },
  'movie theater': { googleType: 'movie_theater', keywords: ['movie theater', 'cinema', 'movies', 'film'] },
  'theater': { googleType: 'performing_arts_theater', keywords: ['theater', 'play', 'musical', 'broadway', 'theatre'] },
  'comedy theater': { googleType: 'performing_arts_theater', keywords: ['comedy theater', 'improv', 'sketch comedy', 'comedy show'] },
  'live music': { googleType: 'night_club', keywords: ['live music', 'concert', 'music venue', 'live band'] },
  'concert': { googleType: 'night_club', keywords: ['concert', 'live music', 'music venue', 'concert hall'] },
  
  // Entertainment - Gaming & Arcades
  'arcade': { googleType: 'amusement_center', keywords: ['arcade', 'game room', 'retro arcade', 'video games'] },
  'escape room': { googleType: 'amusement_center', keywords: ['escape room', 'escape game', 'puzzle room', 'mystery room'] },
  'virtual reality': { googleType: 'amusement_center', keywords: ['virtual reality', 'vr', 'vr arcade', 'vr experience'] },
  'laser tag': { googleType: 'amusement_center', keywords: ['laser tag', 'laser arena', 'laser game'] },
  
  // Sports & Recreation - Bowling & Indoor
  'bowling': { googleType: 'bowling_alley', keywords: ['bowling', 'bowling alley', 'lanes', 'bowling center'] },
  'pool hall': { googleType: 'bar', keywords: ['pool hall', 'billiards', 'pool table', 'billiard room'] },
  'billiards': { googleType: 'bar', keywords: ['billiards', 'pool hall', 'snooker', 'pool'] },
  
  // Sports & Recreation - Golf
  'golf': { googleType: 'park', keywords: ['golf', 'golf course', 'driving range', 'top golf', 'golfing'] },
  'mini golf': { googleType: 'amusement_center', keywords: ['mini golf', 'putt putt', 'miniature golf', 'crazy golf'] },
  'driving range': { googleType: 'park', keywords: ['driving range', 'golf range', 'golf practice'] },
  
  // Sports & Recreation - Active
  'axe throwing': { googleType: 'amusement_center', keywords: ['axe throwing', 'hatchet throwing', 'ax throwing'] },
  'go karts': { googleType: 'amusement_center', keywords: ['go karts', 'go karting', 'racing', 'kart racing'] },
  'trampoline park': { googleType: 'amusement_center', keywords: ['trampoline park', 'jump park', 'trampoline'] },
  'rock climbing': { googleType: 'amusement_center', keywords: ['rock climbing', 'climbing gym', 'bouldering', 'indoor climbing'] },
  'ice skating': { googleType: 'amusement_center', keywords: ['ice skating', 'ice rink', 'skating rink'] },
  'roller skating': { googleType: 'amusement_center', keywords: ['roller skating', 'roller rink', 'rollerskating'] },
  'rage room': { googleType: 'amusement_center', keywords: ['rage room', 'smash room', 'break room', 'anger room'] },
  
  // Arts & Culture
  'art gallery': { googleType: 'art_gallery', keywords: ['art gallery', 'gallery', 'art exhibit', 'art show'] },
  'museum': { googleType: 'museum', keywords: ['museum', 'exhibit', 'exhibition', 'museum tour'] },
  'aquarium': { googleType: 'aquarium', keywords: ['aquarium', 'marine life', 'sea life', 'ocean exhibit'] },
  'zoo': { googleType: 'zoo', keywords: ['zoo', 'zoological garden', 'animal park', 'wildlife'] },
  'botanical garden': { googleType: 'park', keywords: ['botanical garden', 'gardens', 'plant garden', 'arboretum'] },
  'observatory': { googleType: 'tourist_attraction', keywords: ['observatory', 'planetarium', 'stars', 'astronomy'] },
  'planetarium': { googleType: 'tourist_attraction', keywords: ['planetarium', 'space center', 'astronomy'] },
  
  // Classes & Experiences
  'painting class': { googleType: 'art_gallery', keywords: ['painting class', 'paint night', 'sip and paint', 'art class'] },
  'art class': { googleType: 'art_gallery', keywords: ['art class', 'painting class', 'drawing class'] },
  'cooking class': { googleType: 'restaurant', keywords: ['cooking class', 'culinary class', 'chef class', 'cooking school'] },
  'wine tasting': { googleType: 'bar', keywords: ['wine tasting', 'winery', 'vineyard', 'wine tour'] },
  'pottery class': { googleType: 'art_gallery', keywords: ['pottery class', 'ceramics class', 'clay', 'pottery studio'] },
  'dance class': { googleType: 'night_club', keywords: ['dance class', 'dance studio', 'salsa class', 'ballroom'] },
  'paint and sip': { googleType: 'art_gallery', keywords: ['paint and sip', 'sip and paint', 'wine and paint'] },
  
  // Outdoor & Nature
  'park': { googleType: 'park', keywords: ['park', 'outdoor', 'nature walk', 'hiking', 'trail'] },
  'beach': { googleType: 'park', keywords: ['beach', 'boardwalk', 'waterfront', 'ocean', 'shore'] },
  'hiking': { googleType: 'park', keywords: ['hiking', 'trail', 'nature walk', 'hike'] },
  'picnic': { googleType: 'park', keywords: ['picnic', 'picnic spot', 'outdoor dining', 'park'] },
  
  // Entertainment Venues
  'casino': { googleType: 'casino', keywords: ['casino', 'gaming', 'poker', 'slots'] },
  'spa': { googleType: 'spa', keywords: ['spa', 'massage', 'wellness', 'relaxation'] },
  'sports game': { googleType: 'stadium', keywords: ['sports game', 'game', 'stadium', 'arena'] },
  'stadium': { googleType: 'stadium', keywords: ['stadium', 'arena', 'sports venue'] },
  
  // General
  'entertainment': { googleType: 'amusement_center', keywords: ['entertainment', 'fun', 'activity'] },
};

// Utility functions
export function getRestaurantMapping(keyword: string): VenueMapping | null {
  const normalized = keyword.toLowerCase().trim();
  return restaurantMappings[normalized] || null;
}

export function getBarMapping(keyword: string): VenueMapping | null {
  const normalized = keyword.toLowerCase().trim();
  return barMappings[normalized] || null;
}

export function getActivityMapping(keyword: string): VenueMapping | null {
  const normalized = keyword.toLowerCase().trim();
  return activityMappings[normalized] || null;
}

// Check if result should be excluded based on types
export function shouldExcludeResult(placeTypes: string[], searchKeyword: string): boolean {
  const keyword = searchKeyword.toLowerCase();
  
  // If searching for "bar" or "lounge", exclude salons, spas, beauty services
  if (keyword.includes('bar') || keyword.includes('lounge')) {
    const excludeTypes = [
      'beauty_salon', 'hair_care', 'spa', 'nail_salon', 'barber_shop',
      'hair_salon', 'salon', 'beauty', 'cosmetics'
    ];
    return placeTypes.some(type => excludeTypes.includes(type));
  }
  
  // If searching for restaurant-related terms, exclude non-food places
  if (keyword.includes('restaurant') || keyword.includes('food')) {
    const excludeTypes = ['store', 'shop', 'retail', 'grocery'];
    return placeTypes.some(type => excludeTypes.includes(type));
  }
  
  return false;
}

// Get all keywords for a venue type
export function getAllKeywords(venueType: string, category: 'restaurant' | 'bar' | 'activity'): string[] {
  let mapping: VenueMapping | null = null;
  
  if (category === 'restaurant') mapping = getRestaurantMapping(venueType);
  else if (category === 'bar') mapping = getBarMapping(venueType);
  else if (category === 'activity') mapping = getActivityMapping(venueType);
  
  return mapping?.keywords || [venueType];
}
