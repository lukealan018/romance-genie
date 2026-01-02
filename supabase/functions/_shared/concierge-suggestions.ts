// Concierge Intelligence: Curated fallback lists and smart suggestions for date-worthy experiences

/**
 * Date Night Concierge Intelligence
 * 
 * This module provides:
 * 1. Curated fallback activity suggestions when API results are weak
 * 2. Smart alternatives when specific venues aren't found
 * 3. Date-night scoring to prioritize romantic/fun venues over generic ones
 */

// === OUTDOOR EXPERIENCE FALLBACKS ===
// When "outdoor" search returns mostly parks, suggest these alternatives
export const OUTDOOR_FALLBACKS = {
  dateWorthy: [
    'rooftop bar',
    'rooftop lounge', 
    'botanical garden',
    'outdoor cinema',
    'sunset spot',
    'scenic overlook',
    'beach bonfire',
    'outdoor concert',
    'food truck park',
    'waterfront',
    'pier',
    'night market',
  ],
  expandKeywords: [
    'rooftop', 'patio', 'terrace', 'garden venue', 'outdoor dining', 
    'outdoor entertainment', 'scenic view', 'waterfront venue'
  ],
};

// === ACTIVITY FALLBACK MAPPINGS ===
// When a specific venue type isn't found, suggest similar experiences
export const ACTIVITY_FALLBACKS: Record<string, string[]> = {
  'speakeasy': ['cocktail lounge', 'whiskey bar', 'jazz lounge', 'rooftop bar', 'lounge bar'],
  'jazz lounge': ['live music', 'cocktail lounge', 'piano bar', 'lounge bar'],
  'comedy club': ['improv theater', 'live entertainment', 'karaoke bar', 'comedy theater'],
  'drive-in': ['outdoor cinema', 'movie theater', 'rooftop cinema'],
  'beach bonfire': ['beach', 'waterfront', 'outdoor venue', 'fire pit'],
  'tiki bar': ['cocktail bar', 'rooftop bar', 'tropical', 'rum bar'],
  'wine tasting': ['wine bar', 'winery', 'vineyard', 'tasting room'],
  'cooking class': ['culinary experience', 'chef table', 'tasting menu'],
  'pottery class': ['art class', 'paint and sip', 'creative studio'],
  'escape room': ['arcade', 'axe throwing', 'laser tag', 'immersive experience'],
  'outdoor activity': ['rooftop bar', 'botanical garden', 'scenic overlook', 'waterfront'],
};

// === GENERIC VENUE EXCLUSIONS ===
// These are NOT date-worthy on their own - used to filter weak results
export const NON_DATE_VENUES = [
  'city park',
  'community park', 
  'dog park',
  'playground',
  'parking lot',
  'gas station',
  'convenience store',
  'fast food',
  'chain restaurant',
  'mall',
  'strip mall',
  'office building',
];

// === DATE NIGHT SCORING ===
// Boost score for venues with these characteristics
export const DATE_WORTHY_INDICATORS = {
  highValue: [
    'rooftop', 'speakeasy', 'hidden', 'secret', 'romantic', 'intimate',
    'craft cocktail', 'tasting', 'live music', 'jazz', 'sunset', 'view',
    'boutique', 'artisan', 'upscale', 'elegant', 'sophisticated',
  ],
  mediumValue: [
    'lounge', 'bar', 'cocktail', 'wine', 'beer garden', 'outdoor',
    'patio', 'terrace', 'garden', 'cinema', 'theater', 'gallery',
  ],
  lowValue: [
    'sports bar', 'chain', 'franchise', 'basic', 'casual',
  ],
};

// === HELPER FUNCTIONS ===

/**
 * Check if a venue name/type indicates a generic park (not date-worthy for "outdoor" requests)
 */
export function isGenericPark(name: string, types: string[] = []): boolean {
  const nameLower = name.toLowerCase();
  
  // Exceptions - these are date-worthy even if they contain "park"
  const dateWorthyParkExceptions = [
    'food truck', 'beer garden', 'sculpture garden', 'botanical',
    'amphitheater', 'outdoor cinema', 'rooftop', 'themed park',
    'adventure park', 'amusement',
  ];
  
  if (dateWorthyParkExceptions.some(exc => nameLower.includes(exc))) {
    return false;
  }
  
  // Check for generic park indicators
  const genericParkIndicators = [
    'city park', 'community park', 'memorial park', 'regional park',
    'county park', 'state park', 'public park', 'neighborhood park',
    'dog park', 'playground', 'sports field', 'soccer field', 'baseball field',
  ];
  
  if (genericParkIndicators.some(ind => nameLower.includes(ind))) {
    return true;
  }
  
  // If types include 'park' and name ends with 'Park' without qualifiers
  if (types.includes('park') && nameLower.endsWith('park') && !nameLower.includes('theme')) {
    // Additional check - if it's just "[Name] Park", it's likely generic
    const words = nameLower.split(' ');
    if (words.length <= 2) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate a "date worthiness" score for an activity
 */
export function calculateDateScore(name: string, rating: number = 0, totalRatings: number = 0): number {
  const nameLower = name.toLowerCase();
  let score = 0;
  
  // Base score from rating (0-20 points)
  if (rating >= 4.5) score += 20;
  else if (rating >= 4.2) score += 15;
  else if (rating >= 4.0) score += 10;
  else if (rating >= 3.5) score += 5;
  
  // Review count bonus (0-10 points)
  if (totalRatings >= 500) score += 10;
  else if (totalRatings >= 200) score += 7;
  else if (totalRatings >= 100) score += 5;
  else if (totalRatings >= 50) score += 3;
  
  // High-value indicator bonus (0-30 points)
  const highMatches = DATE_WORTHY_INDICATORS.highValue.filter(ind => nameLower.includes(ind));
  score += Math.min(highMatches.length * 10, 30);
  
  // Medium-value indicator bonus (0-15 points)
  const medMatches = DATE_WORTHY_INDICATORS.mediumValue.filter(ind => nameLower.includes(ind));
  score += Math.min(medMatches.length * 5, 15);
  
  // Penalty for low-value indicators (-10 points each)
  const lowMatches = DATE_WORTHY_INDICATORS.lowValue.filter(ind => nameLower.includes(ind));
  score -= lowMatches.length * 10;
  
  // Penalty for non-date venues (-50 points)
  if (NON_DATE_VENUES.some(nv => nameLower.includes(nv))) {
    score -= 50;
  }
  
  return Math.max(score, 0);
}

/**
 * Get fallback keywords when a search returns weak results
 */
export function getFallbackKeywords(originalKeyword: string, resultsAreWeak: boolean): string[] {
  const keyword = originalKeyword.toLowerCase();
  
  if (!resultsAreWeak) return [];
  
  // Check if this is an "outdoor" type request
  if (keyword.includes('outdoor') || keyword.includes('park') || keyword.includes('outside')) {
    return OUTDOOR_FALLBACKS.expandKeywords;
  }
  
  // Check direct fallbacks
  if (ACTIVITY_FALLBACKS[keyword]) {
    return ACTIVITY_FALLBACKS[keyword];
  }
  
  // Partial matches
  for (const [key, fallbacks] of Object.entries(ACTIVITY_FALLBACKS)) {
    if (keyword.includes(key) || key.includes(keyword)) {
      return fallbacks;
    }
  }
  
  return [];
}

/**
 * Check if results are "weak" (mostly parks, low ratings, few options)
 */
export function areResultsWeak(
  results: { name: string; rating?: number; types?: string[] }[],
  originalKeyword: string
): boolean {
  if (results.length === 0) return true;
  if (results.length < 3) return true;
  
  const keyword = originalKeyword.toLowerCase();
  const isOutdoorSearch = keyword.includes('outdoor') || keyword.includes('fun') || keyword.includes('activity');
  
  if (isOutdoorSearch) {
    // Count how many are generic parks
    const parkCount = results.filter(r => isGenericPark(r.name, r.types)).length;
    // If more than half are generic parks, results are weak
    if (parkCount > results.length / 2) {
      return true;
    }
  }
  
  // Check average rating
  const ratings = results.filter(r => r.rating && r.rating > 0).map(r => r.rating!);
  if (ratings.length > 0) {
    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    if (avgRating < 4.0) return true;
  }
  
  return false;
}
