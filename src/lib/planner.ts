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
  source?: string;
  isHiddenGem?: boolean;
  isNewDiscovery?: boolean;
  isLocalFavorite?: boolean;
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
  qualityFloor?: number;
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
    indoorPreference?: number;
    energyLevel?: 'low' | 'medium' | 'high';
  };
  planIntent?: string | null;
  mood?: string;
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
  },
  planIntent?: string | null,
  mood?: string,
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
    
    // Apply quality floor penalty for Surprise Me mode
    let qualityPenalty = 0;
    if (intent === 'surprise' && learnedPreferences?.qualityFloor) {
      if (place.rating < learnedPreferences.qualityFloor) {
        // Heavy penalty for places below quality floor in Surprise mode
        qualityPenalty = -0.3;
      }
    }
    
    // Random jitter for rotation (prevents same venues always ranking #1)
    const randomJitter = (Math.random() - 0.5); // range: -0.5 to 0.5
    
    // === DATE-WORTHINESS SCORING (Phase 5) ===
    let dateWorthinessBoost = 0;
    if (type === 'restaurant' && (planIntent === 'dinner_and_show' || planIntent === 'dinner_and_activity' || mood === 'romantic')) {
      const nameLower = place.name.toLowerCase();
      const priceLvl = place.priceLevel?.toLowerCase() || '';
      
      // Boost for date-worthy ambiance keywords
      const ambianceKeywords = ['steakhouse', 'bistro', 'tapas', 'rooftop', 'lounge', 'wine bar', 'trattoria', 'brasserie', 'omakase', 'fine dining', 'tasting'];
      if (ambianceKeywords.some(kw => nameLower.includes(kw))) {
        dateWorthinessBoost += 0.20;
      }
      
      // Boost for moderate+ price level
      if (priceLvl === 'moderate' || priceLvl === 'upscale') {
        dateWorthinessBoost += 0.15;
      }
      
      // Penalize counter-service / fast-casual / lunch-oriented names
      const penaltyKeywords = [
        'deli', 'market', 'express', 'drive-thru', 'drive thru', 'counter', 
        'sandwich', 'sub', 'subs', 'wrap', 'wraps', 'bagel', 'donut', 'doughnut',
        'smoothie', 'juice', 'salad', 'bowl', 'poke', 'acai',
        'cafe', 'café', 'coffee', 'bakery', 'pastry', 'boba', 'bubble tea',
        'fast', 'quick', 'grab', 'to go', 'takeout', 'take out',
      ];
      if (penaltyKeywords.some(kw => nameLower.includes(kw))) {
        // Extra-heavy penalty: these are clearly not dinner-date venues
        dateWorthinessBoost -= 0.40;
      }
      
      // Penalize budget price when it's a show night
      if (priceLvl === 'budget' && planIntent === 'dinner_and_show') {
        dateWorthinessBoost -= 0.20;
      }
    }
    
    // Adjust scoring weights based on intent (TIERED LEARNING)
    let score = 0;
    if (intent === 'surprise') {
      score = 
        0.30 * noveltyBoost +
        0.25 * ratingNorm +
        0.15 * learnedBoost +
        0.10 * contextualBoost +
        0.10 * personalFit +
        0.05 * proximityNorm +
        0.20 * randomJitter +
        qualityPenalty +
        dateWorthinessBoost;
    } else if (intent === 'specific') {
      score = 
        0.35 * learnedBoost +
        0.25 * personalFit +
        0.20 * ratingNorm +
        0.10 * proximityNorm +
        0.10 * contextualBoost +
        dateWorthinessBoost;
    } else {
      score = 
        0.25 * personalFit +
        0.25 * learnedBoost +
        0.20 * ratingNorm +
        0.15 * contextualBoost +
        0.10 * proximityNorm +
        0.05 * noveltyBoost +
        0.10 * randomJitter +
        dateWorthinessBoost;
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
  planIntent,
  mood,
}: BuildPlanParams & { searchMode?: SearchMode }): PlanResult {
  // Only score restaurants if mode includes them
  const scoredRestaurants = (searchMode === 'both' || searchMode === 'restaurant_only')
    ? scorePlaces(
        restaurants, lat, lng, radius, preferences, 'restaurant', 
        learnedPreferences, intent, noveltyLevel, userInteractionPlaceIds, contextualHints,
        planIntent, mood
      )
    : [];

  // Only score activities if mode includes them
  const scoredActivities = (searchMode === 'both' || searchMode === 'activity_only')
    ? scorePlaces(
        activities, lat, lng, radius, preferences, 'activity', 
        learnedPreferences, intent, noveltyLevel, userInteractionPlaceIds, contextualHints,
        planIntent, mood
      )
    : [];

  // === PROXIMITY PAIRING: Pick the activity closest to the top restaurant ===
  // This prevents the restaurant and activity from being 29+ minutes apart.
  let restaurant: Place | null = scoredRestaurants.length > 0 ? scoredRestaurants[0] : null;
  let activity: Place | null = null;

  if (searchMode === 'both' && restaurant && scoredActivities.length > 0) {
    // From the top-5 activities (by score), pick the one closest to the restaurant
    const candidateActivities = scoredActivities.slice(0, Math.min(5, scoredActivities.length));
    let bestActivity = candidateActivities[0];
    let bestDistance = calculateDistance(restaurant.lat, restaurant.lng, bestActivity.lat, bestActivity.lng);

    for (let i = 1; i < candidateActivities.length; i++) {
      const d = calculateDistance(restaurant.lat, restaurant.lng, candidateActivities[i].lat, candidateActivities[i].lng);
      if (d < bestDistance) {
        bestDistance = d;
        bestActivity = candidateActivities[i];
      }
    }
    activity = bestActivity;
  } else {
    activity = scoredActivities.length > 0 ? scoredActivities[0] : null;
  }

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

// === PHASE 4: Plan Sequencing Constants ===
const DINNER_DURATION = 90; // minutes
const TRAVEL_TIME = 15; // minutes
const DESSERT_DURATION = 45; // minutes

interface SequencedPlanResult extends PlanResult {
  sequence: "dinner_first" | "show_first";
  planNarrative: string | null;
  timing: {
    dinnerStart: string | null;
    dinnerEnd: string | null;
    travelTime: number;
    activityStart: string | null;
    activityEnd: string | null;
  } | null;
}

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function buildSequencedPlan(
  params: BuildPlanParams & { searchMode?: SearchMode; scheduledTime?: string }
): SequencedPlanResult {
  const { scheduledTime, planIntent } = params;
  
  // If not a dinner_and_show intent, fall back to regular buildPlan
  if (planIntent !== 'dinner_and_show' || !scheduledTime) {
    const result = buildPlan(params);
    return {
      ...result,
      sequence: "dinner_first",
      planNarrative: null,
      timing: null,
    };
  }

  // Parse scheduled time to minutes
  const [h, m] = scheduledTime.split(':').map(Number);
  const scheduledMinutes = h * 60 + (m || 0);
  
  // DINNER_AND_SHOW: Pick activity FIRST (the show), then fit dinner before it
  const searchMode = params.searchMode || 'both';
  
  const scoredActivities = scorePlaces(
    params.activities, params.lat, params.lng, params.radius, params.preferences, 'activity',
    params.learnedPreferences, params.intent, params.noveltyLevel, params.userInteractionPlaceIds,
    params.contextualHints, planIntent, params.mood
  );
  
  const scoredRestaurants = scorePlaces(
    params.restaurants, params.lat, params.lng, params.radius, params.preferences, 'restaurant',
    params.learnedPreferences, params.intent, params.noveltyLevel, params.userInteractionPlaceIds,
    params.contextualHints, planIntent, params.mood
  );
  
  if (scoredActivities.length === 0 || scoredRestaurants.length === 0) {
    // Not enough data for sequencing, fall back
    const result = buildPlan(params);
    return { ...result, sequence: "dinner_first", planNarrative: null, timing: null };
  }
  
  // Pick the top activity (the show)
  const activity = scoredActivities[0];
  
  // Determine activity start time — use eventStartMinutes if available, else scheduledTime
  const activityStartMinutes = (activity as any).eventStartMinutes || scheduledMinutes;
  
  // Compute latest dinner start: show time - dinner duration - travel time
  const latestDinnerStart = activityStartMinutes - DINNER_DURATION - TRAVEL_TIME;
  
  // Try dinner-first sequence
  if (latestDinnerStart >= 11 * 60) { // Don't suggest dinner before 11 AM
    // Pick restaurant closest to activity venue from top candidates
    const MAX_MILES_FROM_VENUE = 5;
    const nearbyRestaurants = scoredRestaurants.filter(r => 
      calculateDistance(r.lat, r.lng, activity.lat, activity.lng) <= MAX_MILES_FROM_VENUE
    );
    
    const restaurant = nearbyRestaurants.length > 0 ? nearbyRestaurants[0] : scoredRestaurants[0];
    const distBetween = calculateDistance(restaurant.lat, restaurant.lng, activity.lat, activity.lng);
    const estimatedTravel = Math.max(TRAVEL_TIME, Math.round(distBetween * 4)); // ~4 min per mile rough estimate
    
    const dinnerEndMinutes = latestDinnerStart + DINNER_DURATION;
    
    return {
      restaurant,
      activity,
      distances: {
        toRestaurant: calculateDistance(params.lat, params.lng, restaurant.lat, restaurant.lng),
        toActivity: calculateDistance(params.lat, params.lng, activity.lat, activity.lng),
        betweenPlaces: distBetween,
      },
      sequence: "dinner_first",
      planNarrative: `Dinner at ${formatTime(latestDinnerStart)}, ${estimatedTravel} min drive, show starts at ${formatTime(activityStartMinutes)}`,
      timing: {
        dinnerStart: formatTime(latestDinnerStart),
        dinnerEnd: formatTime(dinnerEndMinutes),
        travelTime: estimatedTravel,
        activityStart: formatTime(activityStartMinutes),
        activityEnd: formatTime(activityStartMinutes + 120), // Assume 2h show
      },
    };
  }
  
  // Dinner-first doesn't fit — try show-first, dessert/cocktails after
  const dessertStart = activityStartMinutes + 120; // After 2h show
  const restaurant = scoredRestaurants[0];
  const distBetween = calculateDistance(restaurant.lat, restaurant.lng, activity.lat, activity.lng);
  
  return {
    restaurant,
    activity,
    distances: {
      toRestaurant: calculateDistance(params.lat, params.lng, restaurant.lat, restaurant.lng),
      toActivity: calculateDistance(params.lat, params.lng, activity.lat, activity.lng),
      betweenPlaces: distBetween,
    },
    sequence: "show_first",
    planNarrative: `Show at ${formatTime(activityStartMinutes)}, then dessert/cocktails at ${formatTime(dessertStart)}`,
    timing: {
      dinnerStart: formatTime(dessertStart),
      dinnerEnd: formatTime(dessertStart + DESSERT_DURATION),
      travelTime: TRAVEL_TIME,
      activityStart: formatTime(activityStartMinutes),
      activityEnd: formatTime(activityStartMinutes + 120),
    },
  };
}
