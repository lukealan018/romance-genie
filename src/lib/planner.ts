interface Place {
  id: string;
  name: string;
  rating: number;
  totalRatings: number;
  address: string;
  lat: number;
  lng: number;
  priceLevel?: string;
  cuisine?: string;
  category?: 'event' | 'activity';
  city?: string;
}

type SearchMode = "both" | "restaurant_only" | "activity_only";

interface PlanResult {
  restaurant: Place | null;
  activity: Place | null;
  distances: {
    toRestaurant: number;
    toActivity: number;
    betweenPlaces: number;
  };
}

interface UserPreferences {
  cuisines: string[];
  activities: string[];
}

interface LearnedPreferences {
  favoriteCuisines: { cuisine: string; score: number }[];
  favoriteActivities: { category: string; score: number }[];
  avgRatingThreshold: number;
  pricePreference: string;
}

interface BuildPlanParams {
  lat: number;
  lng: number;
  radius: number;
  restaurants: Place[];
  activities: Place[];
  preferences?: UserPreferences;
  learnedPreferences?: LearnedPreferences;
  intent?: "surprise" | "specific" | "flexible";
  noveltyLevel?: "safe" | "adventurous" | "wild";
  userInteractionPlaceIds?: string[];
  contextualHints?: {
    indoorPreference?: number; // -1 to 1 scale
    energyLevel?: 'low' | 'medium' | 'high';
  };
}

// Calculate distance between two points in miles using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Normalize rating from 3.5-5.0 scale to 0-1
function normalizeRating(rating: number): number {
  const min = 3.5;
  const max = 5.0;
  return Math.max(0, Math.min(1, (rating - min) / (max - min)));
}

// Normalize proximity (closer = higher score)
function normalizeProximity(distanceMiles: number, maxRadius: number): number {
  // Invert so closer is better, cap at maxRadius
  const cappedDistance = Math.min(distanceMiles, maxRadius);
  return 1 - (cappedDistance / maxRadius);
}

// Normalize popularity based on total ratings
function normalizePopularity(totalRatings: number, maxRatings: number): number {
  if (maxRatings === 0) return 0;
  return Math.min(1, totalRatings / maxRatings);
}

// Calculate personal fit based on profile preferences
function calculatePersonalFit(
  place: Place,
  preferences: UserPreferences | undefined,
  type: 'restaurant' | 'activity'
): number {
  if (!preferences) return 0.5; // Neutral if no preferences
  
  if (type === 'restaurant' && place.cuisine) {
    const cuisineMatch = preferences.cuisines.some(c => 
      place.cuisine?.toLowerCase().includes(c.toLowerCase())
    );
    return cuisineMatch ? 1 : 0;
  }
  
  if (type === 'activity' && place.category) {
    const activityMatch = preferences.activities.some(a => 
      place.category?.toLowerCase().includes(a.toLowerCase()) ||
      a.toLowerCase().includes(place.category?.toLowerCase() || '')
    );
    return activityMatch ? 1 : 0;
  }
  
  return 0.5; // Neutral if no match data available
}

// Score a place based on multiple factors
function scorePlaces(
  places: Place[],
  userLat: number,
  userLng: number,
  radius: number,
  preferences: UserPreferences | undefined,
  type: 'restaurant' | 'activity',
  learnedPreferences?: LearnedPreferences,
  intent?: "surprise" | "specific" | "flexible",
  noveltyLevel?: "safe" | "adventurous" | "wild",
  userInteractionPlaceIds?: string[],
  contextualHints?: {
    indoorPreference?: number;
    energyLevel?: 'low' | 'medium' | 'high';
  }
): Place[] {
  if (places.length === 0) return [];
  
  // Find max values for normalization
  const maxRatings = Math.max(...places.map(p => p.totalRatings), 1);
  
  // Score each place
  const scoredPlaces = places.map(place => {
    const distance = calculateDistance(userLat, userLng, place.lat, place.lng);
    
    // Note: Google Places API doesn't return cuisine/category fields directly
    // so personalFit will be neutral (0.5) until we enhance the API responses
    const personalFit = calculatePersonalFit(place, preferences, type);
    const ratingNorm = normalizeRating(place.rating);
    const proximityNorm = normalizeProximity(distance, radius);
    const popularityNorm = normalizePopularity(place.totalRatings, maxRatings);
    
    // Calculate learned preference boost
    let learnedBoost = 0;
    if (learnedPreferences) {
      if (type === 'restaurant' && place.cuisine) {
        const learned = learnedPreferences.favoriteCuisines.find(
          c => c.cuisine.toLowerCase() === place.cuisine?.toLowerCase()
        );
        if (learned) {
          // Boost based on how often they picked this cuisine
          learnedBoost = Math.min(0.3, learned.score * 0.1);
        }
      } else if (type === 'activity' && place.category) {
        const learned = learnedPreferences.favoriteActivities.find(
          a => a.category.toLowerCase() === place.category?.toLowerCase()
        );
        if (learned) {
          // Boost based on how often they picked this activity
          learnedBoost = Math.min(0.3, learned.score * 0.1);
        }
      }
    }
    
    // Calculate novelty score (for "surprise me" mode)
    let noveltyBoost = 0;
    if (intent === 'surprise' && userInteractionPlaceIds) {
      // Has user seen/selected this place before?
      const hasInteracted = userInteractionPlaceIds.includes(place.id);
      
      if (!hasInteracted) {
        // Novel place - boost based on novelty level
        if (noveltyLevel === 'wild') {
          noveltyBoost = 0.4; // Strong boost for wild mode
        } else if (noveltyLevel === 'adventurous') {
          noveltyBoost = 0.25; // Moderate boost
        } else {
          noveltyBoost = 0.15; // Small boost for safe
        }
      } else {
        // User has seen this before - penalize in surprise mode
        noveltyBoost = -0.3;
      }
      
      // In surprise mode, penalize exact cuisine/category matches
      if (personalFit === 1) {
        noveltyBoost -= 0.15;
      }
    }
    
    // Calculate contextual boost based on weather/energy
    let contextualBoost = 0;
    if (contextualHints && type === 'activity') {
      // Indoor/outdoor preference based on weather
      if (contextualHints.indoorPreference !== undefined) {
        const isIndoorActivity = place.category && 
          ['museum', 'theater', 'arcade', 'bowling', 'spa', 'mall'].some(indoor =>
            place.category?.toLowerCase().includes(indoor)
          );
        const isOutdoorActivity = place.category &&
          ['park', 'hiking', 'mini golf', 'outdoor'].some(outdoor =>
            place.category?.toLowerCase().includes(outdoor)
          );
        
        if (contextualHints.indoorPreference > 0 && isIndoorActivity) {
          contextualBoost += 0.2 * contextualHints.indoorPreference;
        } else if (contextualHints.indoorPreference < 0 && isOutdoorActivity) {
          contextualBoost += 0.2 * Math.abs(contextualHints.indoorPreference);
        }
      }
      
      // Energy level adjustments
      if (contextualHints.energyLevel === 'low') {
        const isRelaxing = place.category &&
          ['spa', 'wine bar', 'theater', 'museum'].some(calm =>
            place.category?.toLowerCase().includes(calm)
          );
        if (isRelaxing) contextualBoost += 0.15;
      } else if (contextualHints.energyLevel === 'high') {
        const isEnergetic = place.category &&
          ['arcade', 'mini golf', 'karaoke', 'bowling', 'sports'].some(active =>
            place.category?.toLowerCase().includes(active)
          );
        if (isEnergetic) contextualBoost += 0.15;
      }
    }
    
    // Adjust scoring weights based on intent
    let score = 0;
    if (intent === 'surprise') {
      // Surprise mode: prioritize novelty and rating over personal fit
      score = 
        0.35 * noveltyBoost +
        0.25 * ratingNorm +
        0.15 * personalFit +
        0.10 * contextualBoost +
        0.10 * learnedBoost +
        0.05 * proximityNorm;
    } else if (intent === 'specific') {
      // Specific mode: prioritize personal fit and proximity
      score = 
        0.40 * personalFit +
        0.25 * ratingNorm +
        0.15 * proximityNorm +
        0.10 * contextualBoost +
        0.10 * learnedBoost;
    } else {
      // Flexible mode: balanced scoring (default)
      score = 
        0.25 * personalFit +
        0.20 * ratingNorm +
        0.20 * learnedBoost +
        0.15 * contextualBoost +
        0.15 * proximityNorm +
        0.05 * noveltyBoost;
    }
    
    return { place, score, distance };
  });
  
  // Sort by score descending, then by distance ascending (tiebreaker)
  scoredPlaces.sort((a, b) => {
    if (Math.abs(a.score - b.score) < 0.01) {
      // If scores are very close, prefer closer places
      return a.distance - b.distance;
    }
    return b.score - a.score;
  });
  
  return scoredPlaces.map(sp => sp.place);
}

export function buildPlan({
  lat,
  lng,
  radius,
  restaurants,
  activities,
  preferences,
  learnedPreferences,
  intent,
  noveltyLevel,
  userInteractionPlaceIds,
  contextualHints,
  searchMode = 'both',
}: BuildPlanParams & { searchMode?: SearchMode }): PlanResult {
  // Only score restaurants if mode includes them
  const scoredRestaurants = (searchMode === 'both' || searchMode === 'restaurant_only')
    ? scorePlaces(
        restaurants, lat, lng, radius, preferences, 'restaurant', 
        learnedPreferences, intent, noveltyLevel, userInteractionPlaceIds, contextualHints
      )
    : [];
  const restaurant = scoredRestaurants.length > 0 ? scoredRestaurants[0] : null;

  // Only score activities if mode includes them
  const scoredActivities = (searchMode === 'both' || searchMode === 'activity_only')
    ? scorePlaces(
        activities, lat, lng, radius, preferences, 'activity', 
        learnedPreferences, intent, noveltyLevel, userInteractionPlaceIds, contextualHints
      )
    : [];
  const activity = scoredActivities.length > 0 ? scoredActivities[0] : null;

  // Calculate distances
  const distances = {
    toRestaurant: restaurant ? calculateDistance(lat, lng, restaurant.lat, restaurant.lng) : 0,
    toActivity: activity ? calculateDistance(lat, lng, activity.lat, activity.lng) : 0,
    betweenPlaces: restaurant && activity 
      ? calculateDistance(restaurant.lat, restaurant.lng, activity.lat, activity.lng)
      : 0,
  };

  return {
    restaurant,
    activity,
    distances,
  };
}

export function buildPlanFromIndices(
  params: BuildPlanParams & { searchMode?: SearchMode },
  restaurantIndex: number,
  activityIndex: number
): PlanResult {
  const searchMode = params.searchMode || 'both';
  
  console.log('🏗️ [buildPlanFromIndices] Called with:', {
    mode: searchMode,
    restaurantCount: params.restaurants.length,
    activityCount: params.activities.length,
    restaurantIndex,
    activityIndex
  });
  
  // Return null for restaurant if mode doesn't include it
  const restaurant = (searchMode === 'both' || searchMode === 'restaurant_only')
    ? (params.restaurants[restaurantIndex] || null)
    : null;
  
  // Return null for activity if mode doesn't include it
  const activity = (searchMode === 'both' || searchMode === 'activity_only')
    ? (params.activities[activityIndex] || null)
    : null;

  console.log('✅ [buildPlanFromIndices] Returning:', {
    hasRestaurant: !!restaurant,
    hasActivity: !!activity,
    restaurantName: restaurant?.name,
    activityName: activity?.name
  });

  const distances = {
    toRestaurant: restaurant ? calculateDistance(params.lat, params.lng, restaurant.lat, restaurant.lng) : 0,
    toActivity: activity ? calculateDistance(params.lat, params.lng, activity.lat, activity.lng) : 0,
    betweenPlaces: restaurant && activity 
      ? calculateDistance(restaurant.lat, restaurant.lng, activity.lat, activity.lng)
      : 0,
  };

  return {
    restaurant,
    activity,
    distances,
  };
}

// Export scorePlaces for use in Index.tsx
export { scorePlaces };
