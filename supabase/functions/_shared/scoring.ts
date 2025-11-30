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
  
  if (reviewCount < 20) {
    // Too new/unknown - risky
    score *= 0.5;
  } else if (reviewCount >= 20 && reviewCount < 50) {
    // New but has some validation
    score *= 0.8;
  } else if (reviewCount >= 50 && reviewCount <= 300) {
    // SWEET SPOT - Hidden gem territory!
    score *= 1.8;
  } else if (reviewCount > 300 && reviewCount <= 800) {
    // Popular local favorite
    score *= 1.3;
  } else if (reviewCount > 800 && reviewCount <= 2000) {
    // Well-known spot
    score *= 1.0;
  } else {
    // Super mainstream (2000+)
    score *= 0.6;
  }
  
  // === FACTOR 2: Chain Detection ===
  // Use Foursquare chains field if available (FREE), otherwise keyword matching
  if (isChainRestaurant(place.name, place.chains)) {
    const chainPenalty = getChainPenalty(place.name);
    score *= chainPenalty;
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
  // Boost unique categories
  const uniqueTypes = [
    'speakeasy', 'wine_bar', 'jazz_club', 'art_gallery',
    'rooftop_bar', 'food_truck', 'pop_up', 'wine_tasting',
    'brewery', 'winery', 'distillery'
  ];
  
  const hasUniqueType = place.types?.some(type => 
    uniqueTypes.includes(type.toLowerCase())
  );
  
  if (hasUniqueType) {
    score *= 1.3;
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
