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
  category?: string;
}

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

interface BuildPlanParams {
  lat: number;
  lng: number;
  radius: number;
  restaurants: Place[];
  activities: Place[];
  preferences?: UserPreferences;
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
  type: 'restaurant' | 'activity'
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
    
    // Weighted score: 50% personal fit, 20% rating, 20% proximity, 10% popularity
    const score = 
      0.5 * personalFit +
      0.2 * ratingNorm +
      0.2 * proximityNorm +
      0.1 * popularityNorm;
    
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
}: BuildPlanParams): PlanResult {
  // Score and sort restaurants by preference fit, rating, proximity, and popularity
  const scoredRestaurants = scorePlaces(restaurants, lat, lng, radius, preferences, 'restaurant');
  const restaurant = scoredRestaurants.length > 0 ? scoredRestaurants[0] : null;

  // Score and sort activities by preference fit, rating, proximity, and popularity
  const scoredActivities = scorePlaces(activities, lat, lng, radius, preferences, 'activity');
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
  params: BuildPlanParams,
  restaurantIndex: number,
  activityIndex: number
): PlanResult {
  const restaurant = params.restaurants[restaurantIndex] || null;
  const activity = params.activities[activityIndex] || null;

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
