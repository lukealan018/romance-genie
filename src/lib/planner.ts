interface Place {
  id: string;
  name: string;
  rating: number;
  totalRatings: number;
  address: string;
  lat: number;
  lng: number;
  priceLevel?: string;
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

interface BuildPlanParams {
  lat: number;
  lng: number;
  radius: number;
  restaurants: Place[];
  activities: Place[];
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

export function buildPlan({
  lat,
  lng,
  radius,
  restaurants,
  activities,
}: BuildPlanParams): PlanResult {
  // Pick top restaurant (highest rated with most reviews)
  const restaurant = restaurants.length > 0
    ? [...restaurants].sort((a, b) => {
        // Prioritize rating first, then total ratings
        if (Math.abs(a.rating - b.rating) > 0.2) {
          return b.rating - a.rating;
        }
        return b.totalRatings - a.totalRatings;
      })[0]
    : null;

  // Find nearest activity within radius
  let activity: Place | null = null;
  let minDistance = Infinity;

  for (const act of activities) {
    const distance = calculateDistance(lat, lng, act.lat, act.lng);
    if (distance <= radius && distance < minDistance) {
      minDistance = distance;
      activity = act;
    }
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
