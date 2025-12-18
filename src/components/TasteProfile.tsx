import { useState, useEffect } from 'react';
import { Loader2, Utensils, Sparkles, TrendingUp, DollarSign, Heart } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TasteData {
  favoriteCuisines: { name: string; count: number }[];
  favoriteActivities: { name: string; count: number }[];
  pricePreference: string;
  hiddenGemVsPopular: 'hidden_gems' | 'popular' | 'balanced';
  totalInteractions: number;
  avgRating: number;
}

export const TasteProfile = () => {
  const [data, setData] = useState<TasteData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasteData = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user?.id) return;

        const userId = session.session.user.id;

        // Fetch user interactions
        const { data: interactions } = await supabase
          .from('user_interactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(100);

        // Fetch user activity (swaps, saves, etc.)
        const { data: activities } = await supabase
          .from('user_activity')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(200);

        // Fetch rated plans
        const { data: ratedPlans } = await supabase
          .from('scheduled_plans')
          .select('rating, restaurant_cuisine, activity_category')
          .eq('user_id', userId)
          .not('rating', 'is', null);

        // Analyze cuisines
        const cuisineCounts: Record<string, number> = {};
        interactions?.forEach(i => {
          if (i.cuisine && i.interaction_type === 'select') {
            cuisineCounts[i.cuisine] = (cuisineCounts[i.cuisine] || 0) + 2;
          }
        });
        activities?.forEach(a => {
          if (a.restaurant_cuisine) {
            if (a.action_type === 'save_combo' || a.action_type === 'schedule') {
              cuisineCounts[a.restaurant_cuisine] = (cuisineCounts[a.restaurant_cuisine] || 0) + 3;
            } else if (a.action_type === 'swap_restaurant') {
              cuisineCounts[a.restaurant_cuisine] = (cuisineCounts[a.restaurant_cuisine] || 0) - 1;
            }
          }
        });

        // Analyze activities
        const activityCounts: Record<string, number> = {};
        interactions?.forEach(i => {
          if (i.category && i.interaction_type === 'select') {
            activityCounts[i.category] = (activityCounts[i.category] || 0) + 2;
          }
        });
        activities?.forEach(a => {
          if (a.activity_category) {
            if (a.action_type === 'save_combo' || a.action_type === 'schedule') {
              activityCounts[a.activity_category] = (activityCounts[a.activity_category] || 0) + 3;
            } else if (a.action_type === 'swap_activity') {
              activityCounts[a.activity_category] = (activityCounts[a.activity_category] || 0) - 1;
            }
          }
        });

        // Analyze price preference
        const priceCounts: Record<string, number> = { '$': 0, '$$': 0, '$$$': 0, '$$$$': 0 };
        activities?.forEach(a => {
          if (a.restaurant_price_level && a.action_type === 'save_combo') {
            priceCounts[a.restaurant_price_level] = (priceCounts[a.restaurant_price_level] || 0) + 1;
          }
        });
        const topPrice = Object.entries(priceCounts)
          .sort((a, b) => b[1] - a[1])[0]?.[0] || '$$';

        // Calculate avg rating
        const ratings = ratedPlans?.map(p => p.rating).filter(Boolean) as number[];
        const avgRating = ratings.length > 0 
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
          : 0;

        // Sort and get top items
        const favoriteCuisines = Object.entries(cuisineCounts)
          .filter(([_, count]) => count > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name: formatLabel(name), count }));

        const favoriteActivities = Object.entries(activityCounts)
          .filter(([_, count]) => count > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, count]) => ({ name: formatLabel(name), count }));

        setData({
          favoriteCuisines,
          favoriteActivities,
          pricePreference: topPrice,
          hiddenGemVsPopular: 'balanced', // Could analyze from swap patterns
          totalInteractions: (interactions?.length || 0) + (activities?.length || 0),
          avgRating,
        });
      } catch (error) {
        console.error('Error fetching taste data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasteData();
  }, []);

  const formatLabel = (str: string) => 
    str.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  if (loading) {
    return (
      <div className="card-luxury flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || data.totalInteractions === 0) {
    return (
      <div className="card-luxury text-center py-8">
        <Sparkles className="w-8 h-8 text-primary mx-auto mb-3" />
        <p className="text-foreground font-medium">Start exploring!</p>
        <p className="text-muted-foreground text-sm mt-1">
          Use the app to build your taste profile
        </p>
      </div>
    );
  }

  const maxCuisineCount = Math.max(...data.favoriteCuisines.map(c => c.count), 1);
  const maxActivityCount = Math.max(...data.favoriteActivities.map(a => a.count), 1);

  return (
    <div className="card-luxury space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-primary" />
        <h2 className="text-luxury-heading">Your Taste Profile</h2>
      </div>

      {/* Stats Row */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
          <TrendingUp className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{data.totalInteractions} interactions</span>
        </div>
        {data.avgRating > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent/10 border border-accent/20">
            <Heart className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">{data.avgRating.toFixed(1)} avg rating</span>
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border">
          <DollarSign className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">{data.pricePreference} preferred</span>
        </div>
      </div>

      {/* Favorite Cuisines */}
      {data.favoriteCuisines.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Utensils className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Top Cuisines</span>
          </div>
          <div className="space-y-2">
            {data.favoriteCuisines.map((cuisine, i) => (
              <div key={cuisine.name} className="flex items-center gap-3">
                <span className="text-sm w-24 truncate">{cuisine.name}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                    style={{ width: `${(cuisine.count / maxCuisineCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Favorite Activities */}
      {data.favoriteActivities.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Top Activities</span>
          </div>
          <div className="space-y-2">
            {data.favoriteActivities.map((activity, i) => (
              <div key={activity.name} className="flex items-center gap-3">
                <span className="text-sm w-24 truncate">{activity.name}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-accent to-primary rounded-full transition-all duration-500"
                    style={{ width: `${(activity.count / maxActivityCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pt-2">
        The AI learns from your choices to improve recommendations
      </p>
    </div>
  );
};
