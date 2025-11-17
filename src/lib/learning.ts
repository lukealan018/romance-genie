import { supabase } from "@/integrations/supabase/client";

export interface LearnedPreferences {
  favoriteCuisines: { cuisine: string; score: number }[];
  favoriteActivities: { category: string; score: number }[];
  avgRatingThreshold: number;
  pricePreference: string;
}

export async function getLearnedPreferences(
  userId: string
): Promise<LearnedPreferences> {
  // Get interactions from last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  
  const { data: interactions } = await supabase
    .from('user_interactions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', ninetyDaysAgo);

  if (!interactions || interactions.length === 0) {
    return {
      favoriteCuisines: [],
      favoriteActivities: [],
      avgRatingThreshold: 4.0,
      pricePreference: '$$',
    };
  }

  // Analyze what they actually selected vs skipped
  const selectedRestaurants = interactions.filter(
    i => i.place_type === 'restaurant' && i.interaction_type === 'selected'
  );
  const selectedActivities = interactions.filter(
    i => i.place_type === 'activity' && i.interaction_type === 'selected'
  );

  // Calculate cuisine scores
  const cuisineScores = new Map<string, number>();
  selectedRestaurants.forEach(r => {
    if (r.cuisine) {
      cuisineScores.set(r.cuisine, (cuisineScores.get(r.cuisine) || 0) + 1);
    }
  });

  const favoriteCuisines = Array.from(cuisineScores.entries())
    .map(([cuisine, count]) => ({ cuisine, score: count }))
    .sort((a, b) => b.score - a.score);

  // Calculate activity scores
  const activityScores = new Map<string, number>();
  selectedActivities.forEach(a => {
    if (a.category) {
      activityScores.set(a.category, (activityScores.get(a.category) || 0) + 1);
    }
  });

  const favoriteActivities = Array.from(activityScores.entries())
    .map(([category, count]) => ({ category, score: count }))
    .sort((a, b) => b.score - a.score);

  // Calculate average rating of selected places
  const allSelectedRatings = [...selectedRestaurants, ...selectedActivities]
    .map(p => p.rating)
    .filter(r => r !== null && r !== undefined) as number[];
  
  const avgRating = allSelectedRatings.length > 0
    ? allSelectedRatings.reduce((sum, r) => sum + r, 0) / allSelectedRatings.length
    : 4.0;

  return {
    favoriteCuisines,
    favoriteActivities,
    avgRatingThreshold: avgRating,
    pricePreference: '$$',
  };
}

export function getContextualSuggestions() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  
  const suggestions = {
    cuisine: '',
    activityCategory: '',
    message: '',
  };
  
  // Friday/Saturday night
  if ((day === 5 || day === 6) && hour >= 18) {
    suggestions.activityCategory = 'Live Music';
    suggestions.message = "It's the weekend! 🎉 How about something lively?";
  }
  // Sunday brunch
  else if (day === 0 && hour >= 10 && hour <= 14) {
    suggestions.cuisine = 'Brunch';
    suggestions.message = "Sunday brunch vibes? 🥞";
  }
  // Weekday lunch
  else if (day >= 1 && day <= 5 && hour >= 11 && hour <= 14) {
    suggestions.message = "Quick lunch spot? I'll find something nearby! 🏃";
  }
  // Weekday evening
  else if (day >= 1 && day <= 5 && hour >= 18) {
    suggestions.message = "Time to unwind! Looking for something chill? 😌";
  }
  
  return suggestions;
}
