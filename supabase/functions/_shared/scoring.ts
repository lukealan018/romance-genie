// Chain Detection & Uniqueness Scoring for Hidden Gems Algorithm

import {
  isFastFoodChain,
  isCasualChain,
  isFineDiningChain,
  isAnyChain,
} from './place-filters.ts';

export type NoveltyMode = 'popular' | 'balanced' | 'hidden_gems';

export interface Place {
  place_id: string;
  name: string;
  rating: number;
  user_ratings_total: number;
  types?: string[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    }
  };
  // Foursquare-specific fields
  source?: string;
  chains?: { id: string; name: string }[]; // Foursquare chains array (FREE tier)
  hasPremiumData?: boolean; // Flag for Foursquare Premium data availability
}

export function isChainRestaurant(name: string, chains?: { id: string; name: string }[]): boolean {
  // If Foursquare chains array is populated (FREE field), use it for accurate detection
  if (chains && chains.length > 0) {
    console.log(`🔗 Chain detected via Foursquare chains field: "${name}" belongs to ${chains.map(c => c.name).join(', ')}`);
    return true;
  }
  
  return isAnyChain(name);
}

export function getChainPenalty(name: string): number {
  // Fast food gets heaviest penalty
  if (isFastFoodChain(name)) {
    return 0.05; // 95% penalty
  }
  
  // Casual dining chains
  if (isCasualChain(name)) {
    return 0.15; // 85% penalty
  }
  
  // FINE DINING CHAINS: Light penalty - they're valid date-night options!
  // Examples: Mastro's, Ruth's Chris, Fleming's, Capital Grille, Eddie V's
  if (isFineDiningChain(name)) {
    return 0.85; // Only 15% penalty - essentially allowed
  }
  
  // Unknown chain (from Foursquare chains field) - moderate penalty
  return 0.3; // 70% penalty
}

export function calculateUniquenessScore(
  place: Place,
  noveltyMode: NoveltyMode = 'balanced'
): number {
  const source = place.source || 'google';
  const hasPremiumData = place.hasPremiumData !== false; // Default true for Google
  
  // === FOURSQUARE FREE TIER HANDLING ===
  // If Foursquare venue with no Premium data (rating=0, reviewCount=0), apply neutral scoring
  if (source === 'foursquare' && !hasPremiumData) {
    console.log(`📊 Foursquare venue "${place.name}": No Premium data - applying neutral score`);
    
    // Still apply chain detection (chains field is FREE)
    const isChain = isChainRestaurant(place.name, place.chains);
    if (isChain) {
      const chainPenalty = getChainPenalty(place.name);
      console.log(`🔗 Foursquare chain "${place.name}": applying penalty ${chainPenalty}`);
      return chainPenalty; // Chain penalty still applies
    }
    
    // Neutral score for non-chain Foursquare venues without Premium data
    return 1.0;
  }
  
  let score = 1.0;
  
  // === FACTOR 1: Review Count (Sweet Spot Detection) ===
  const reviewCount = place.user_ratings_total || 0;
  
  // For hidden_gems mode, use tighter sweet spot (20-200 reviews)
  const isHiddenGemsMode = noveltyMode === 'hidden_gems';
  
  if (reviewCount < 20) {
    // Too new/unknown - risky
    score *= 0.5;
  } else if (reviewCount >= 20 && reviewCount < 50) {
    // New but has some validation - good for hidden gems!
    score *= isHiddenGemsMode ? 1.5 : 0.8;
  } else if (reviewCount >= 50 && reviewCount <= (isHiddenGemsMode ? 200 : 300)) {
    // SWEET SPOT - Hidden gem territory!
    score *= isHiddenGemsMode ? 2.0 : 1.8;
  } else if (reviewCount > (isHiddenGemsMode ? 200 : 300) && reviewCount <= (isHiddenGemsMode ? 500 : 800)) {
    // Popular local favorite - less appealing for hidden gems
    score *= isHiddenGemsMode ? 1.0 : 1.3;
  } else if (reviewCount > (isHiddenGemsMode ? 500 : 800) && reviewCount <= 2000) {
    // Well-known spot - penalize in hidden gems mode
    score *= isHiddenGemsMode ? 0.5 : 1.0;
  } else {
    // Super mainstream (2000+) - heavy penalty in hidden gems mode
    score *= isHiddenGemsMode ? 0.2 : 0.6;
  }
  
  // === FACTOR 2: Chain Detection ===
  // Use Foursquare chains field if available (FREE), otherwise keyword matching
  if (isChainRestaurant(place.name, place.chains)) {
    const chainPenalty = getChainPenalty(place.name);
    // In hidden gems mode, apply HEAVIER chain penalty (almost exclusion)
    const effectivePenalty = isHiddenGemsMode ? chainPenalty * 0.1 : chainPenalty;
    score *= effectivePenalty;
  }
  
  // === FACTOR 3: Rating Quality ===
  // Higher standards for hidden gems
  if (place.rating >= 4.7) {
    score *= 1.4; // Exceptional
  } else if (place.rating >= 4.5) {
    score *= 1.2; // Great
  } else if (place.rating >= 4.0) {
    score *= 1.0; // Good
  } else if (place.rating >= 3.5) {
    score *= 0.7; // Mediocre
  } else {
    score *= 0.3; // Poor
  }
  
  // === FACTOR 4: Type/Category Uniqueness ===
  // EXPANDED list of unique, date-night-worthy categories
  const uniqueTypes = [
    // Unique bars/lounges
    'speakeasy', 'wine_bar', 'jazz_club', 'rooftop_bar', 'tiki_bar',
    'whiskey_bar', 'cocktail_bar', 'lounge', 'hookah_lounge',
    // Unique dining experiences
    'supper_club', 'omakase', 'tasting_menu', 'private_dining',
    'chef_owned', 'farm_to_table', 'pop_up', 'food_truck',
    // Entertainment/experiences
    'art_gallery', 'theater', 'comedy_club', 'live_music',
    'karaoke', 'arcade', 'escape_room', 'axe_throwing',
    'paint_and_sip', 'pottery', 'cooking_class',
    // Craft beverages
    'brewery', 'winery', 'distillery', 'wine_tasting',
    'craft_beer', 'sake_bar', 'mezcal_bar'
  ];
  
  // Check if name/types contain unique keywords
  const nameLower = place.name.toLowerCase();
  const hasUniqueType = place.types?.some(type => 
    uniqueTypes.includes(type.toLowerCase())
  );
  const hasUniqueNameKeyword = uniqueTypes.some(kw => 
    nameLower.includes(kw.replace('_', ' ')) || nameLower.includes(kw.replace('_', ''))
  );
  
  if (hasUniqueType || hasUniqueNameKeyword) {
    score *= isHiddenGemsMode ? 1.8 : 1.3;
  }
  
  // === FACTOR 5: Name-based uniqueness signals ===
  // Boost venues with unique/interesting name patterns
  const uniqueNamePatterns = /speakeasy|underground|secret|hidden|rooftop|basement|cellar|loft|supper|tasting|omakase|izakaya|tapas|mezcal|sake|craft|artisan|boutique|intimate|cozy|tucked|neighborhood|local/i;
  if (uniqueNamePatterns.test(nameLower)) {
    score *= isHiddenGemsMode ? 1.5 : 1.2;
  }
  
  // === MODE ADJUSTMENTS ===
  // Amplify or dampen uniqueness based on user preference
  if (noveltyMode === 'hidden_gems') {
    // Square the score to amplify differences
    score = Math.pow(score, 1.5);
  } else if (noveltyMode === 'popular') {
    // Invert the uniqueness scoring
    if (reviewCount > 1000) {
      score *= 1.5; // Boost popular places
    }
    if (isChainRestaurant(place.name, place.chains)) {
      score *= 3.0; // Remove chain penalty
    }
  }
  
  return Math.max(0.1, Math.min(3.0, score)); // Clamp between 0.1 and 3.0
}

// Determine if a place qualifies as a "hidden gem"
export function isHiddenGem(place: Place): boolean {
  // Skip badge for Foursquare venues without Premium data
  if (place.source === 'foursquare' && place.hasPremiumData === false) {
    return false;
  }
  
  const reviewCount = place.user_ratings_total || 0;
  const isChain = isChainRestaurant(place.name, place.chains);
  const hasGoodRating = place.rating >= 4.5;
  
  // Hidden gem criteria: 50-500 reviews, not a chain, 4.5+ rating
  return reviewCount >= 50 && reviewCount <= 500 && !isChain && hasGoodRating;
}

// Determine if a place is newly discovered
export function isNewDiscovery(place: Place): boolean {
  // Skip badge for Foursquare venues without Premium data
  if (place.source === 'foursquare' && place.hasPremiumData === false) {
    return false;
  }
  
  const reviewCount = place.user_ratings_total || 0;
  return reviewCount < 100 && place.rating >= 4.0;
}

// Determine if a place is a local favorite
export function isLocalFavorite(place: Place): boolean {
  // Skip badge for Foursquare venues without Premium data
  if (place.source === 'foursquare' && place.hasPremiumData === false) {
    return false;
  }
  
  const isChain = isChainRestaurant(place.name, place.chains);
  const hasGoodRating = place.rating >= 4.5;
  const reviewCount = place.user_ratings_total || 0;
  
  return !isChain && hasGoodRating && reviewCount > 100 && reviewCount < 2000;
}
