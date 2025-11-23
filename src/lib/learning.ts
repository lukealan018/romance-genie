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
  const skippedRestaurants = interactions.filter(
    i => i.place_type === 'restaurant' && i.interaction_type === 'skipped'
  );
  const selectedActivities = interactions.filter(
    i => i.place_type === 'activity' && i.interaction_type === 'selected'
  );
  const skippedActivities = interactions.filter(
    i => i.place_type === 'activity' && i.interaction_type === 'skipped'
  );

  // Calculate cuisine scores (selections add +3, skips subtract -1)
  const cuisineScores = new Map<string, number>();
  selectedRestaurants.forEach(r => {
    if (r.cuisine) {
      cuisineScores.set(r.cuisine, (cuisineScores.get(r.cuisine) || 0) + 3);
    }
  });
  skippedRestaurants.forEach(r => {
    if (r.cuisine) {
      cuisineScores.set(r.cuisine, (cuisineScores.get(r.cuisine) || 0) - 1);
    }
  });

  const favoriteCuisines = Array.from(cuisineScores.entries())
    .map(([cuisine, count]) => ({ cuisine, score: count }))
    .filter(c => c.score > 0) // Only positive scores
    .sort((a, b) => b.score - a.score);

  // Calculate activity scores (selections add +3, skips subtract -1)
  const activityScores = new Map<string, number>();
  selectedActivities.forEach(a => {
    if (a.category) {
      activityScores.set(a.category, (activityScores.get(a.category) || 0) + 3);
    }
  });
  skippedActivities.forEach(a => {
    if (a.category) {
      activityScores.set(a.category, (activityScores.get(a.category) || 0) - 1);
    }
  });

  const favoriteActivities = Array.from(activityScores.entries())
    .map(([category, count]) => ({ category, score: count }))
    .filter(c => c.score > 0) // Only positive scores
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

export interface WeatherData {
  temperature: number;
  feelsLike: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

export interface ContextualSuggestionsInput {
  weather?: WeatherData | null;
  occasion?: string | null;
  energyLevel?: 'low' | 'medium' | 'high';
}

export function getContextualSuggestions(input: ContextualSuggestionsInput = {}) {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  const { weather, occasion, energyLevel = 'medium' } = input;
  
  const suggestions = {
    cuisine: '',
    activityCategory: '',
    message: '',
    indoorPreference: 0, // -1 = prefer outdoor, 0 = neutral, 1 = prefer indoor
  };
  
  // Weather-based adjustments
  if (weather) {
    const temp = weather.feelsLike;
    const desc = weather.description.toLowerCase();
    
    // Temperature-based suggestions
    if (temp < 40) {
      suggestions.indoorPreference = 1;
      suggestions.activityCategory = 'Museums';
      suggestions.cuisine = 'Hot Pot,Ramen,Soup';
      suggestions.message = `It's ${temp}°F! 🥶 How about something cozy indoors?`;
      return suggestions;
    } else if (temp > 85) {
      suggestions.indoorPreference = 1;
      suggestions.activityCategory = 'Movie Theater,Bowling';
      suggestions.cuisine = 'Ice Cream,Frozen Yogurt';
      suggestions.message = `Hot out there at ${temp}°F! ☀️ Let's stay cool inside.`;
      return suggestions;
    }
    
    // Weather condition-based
    if (desc.includes('rain') || desc.includes('storm')) {
      suggestions.indoorPreference = 1;
      suggestions.activityCategory = 'Museums,Arcades,Movie Theater';
      suggestions.message = `Rainy day! 🌧️ Perfect for indoor adventures.`;
      return suggestions;
    } else if (desc.includes('snow')) {
      suggestions.indoorPreference = 0.5; // Some people love winter activities!
      suggestions.cuisine = 'Hot Chocolate,Comfort Food';
      suggestions.message = `Snowy vibes! ❄️ Cozy or adventurous?`;
      return suggestions;
    } else if (desc.includes('clear') || desc.includes('sun')) {
      if (temp >= 60 && temp <= 80) {
        suggestions.indoorPreference = -1;
        suggestions.activityCategory = 'Parks,Mini Golf,Hiking';
        suggestions.message = `Beautiful day! 🌤️ Perfect for outdoor fun.`;
        return suggestions;
      }
    }
  }
  
  // Special occasion overrides
  if (occasion) {
    const occasionLower = occasion.toLowerCase();
    if (occasionLower.includes('anniversary') || occasionLower.includes('romantic')) {
      suggestions.cuisine = 'Fine Dining,Italian,French';
      suggestions.activityCategory = 'Live Music,Wine Bar,Rooftop Bar';
      suggestions.message = `Special occasion! 💕 Let's make it memorable.`;
      return suggestions;
    } else if (occasionLower.includes('birthday')) {
      suggestions.activityCategory = 'Karaoke,Bowling,Arcades';
      suggestions.message = `Birthday celebration! 🎂 Time for something fun!`;
      return suggestions;
    } else if (occasionLower.includes('date')) {
      suggestions.cuisine = 'Italian,Tapas,Sushi';
      suggestions.activityCategory = 'Comedy Club,Mini Golf,Wine Bar';
      suggestions.message = `Date night! 💫 Let's find the perfect vibe.`;
      return suggestions;
    }
  }
  
  // Energy level adjustments
  if (energyLevel === 'low') {
    suggestions.activityCategory = 'Movie Theater,Wine Bar,Spa';
    suggestions.message = "Feeling chill? Let's keep it relaxed. 😌";
    return suggestions;
  } else if (energyLevel === 'high') {
    suggestions.activityCategory = 'Arcades,Mini Golf,Karaoke,Bowling';
    suggestions.message = "Got energy? Let's do something active! 🎉";
    return suggestions;
  }
  
  // Time-based defaults (if no weather/occasion)
  // Friday/Saturday night
  if ((day === 5 || day === 6) && hour >= 18) {
    suggestions.activityCategory = 'Live Music,Bars';
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
