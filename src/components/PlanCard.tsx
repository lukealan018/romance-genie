import { useState, useEffect } from "react";
import { ArrowRight, RefreshCw, Loader2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackActivity } from "@/lib/activity-tracker";
import { SharePlanButton } from "./SharePlanButton";
import { VenueCard, estimateTravelTime } from "./plan";
import type { Place, UserReservationPrefs } from "./plan/types";

interface PlanCardProps {
  restaurant: Place | null;
  activity: Place | null;
  distances: {
    toRestaurant: number;
    toActivity: number;
    betweenPlaces: number;
  };
  onSwapRestaurant: () => void;
  onSwapActivity: () => void;
  onReroll: () => void;
  onSkipRestaurant?: (restaurant: Place) => void;
  onSkipActivity?: (activity: Place) => void;
  onSelectPlan?: (restaurant: Place, activity: Place) => void;
  loading?: boolean;
  canSwapRestaurant?: boolean;
  canSwapActivity?: boolean;
  searchMode?: "both" | "restaurant_only" | "activity_only";
}

export const PlanCard = ({
  restaurant,
  activity,
  distances,
  onSwapRestaurant,
  onSwapActivity,
  onReroll,
  onSkipRestaurant,
  onSkipActivity,
  onSelectPlan,
  loading = false,
  canSwapRestaurant = true,
  canSwapActivity = true,
  searchMode = 'both',
}: PlanCardProps) => {
  const [userPreferences, setUserPreferences] = useState<UserReservationPrefs>({});
  const [savingPlan, setSavingPlan] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const fetchUserPreferences = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        if (!session) return;

        const { data: profile } = await supabase.functions.invoke('profile', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });

        if (profile) {
          setUserPreferences({
            date: profile.preferred_date ? new Date(profile.preferred_date) : undefined,
            time: profile.preferred_time ? new Date(`2000-01-01T${profile.preferred_time}`) : undefined,
            partySize: profile.party_size || 2,
          });
        }
      } catch (error) {
        console.error('Error fetching user preferences:', error);
      }
    };
    fetchUserPreferences();
  }, []);

  const handleSavePlan = async () => {
    // For single-mode, only the relevant venue is required
    const hasRequiredData =
      (searchMode === 'restaurant_only' && restaurant) ||
      (searchMode === 'activity_only' && activity) ||
      (searchMode === 'both' && restaurant && activity);

    if (!hasRequiredData) {
      toast({ title: "No plan to save", description: "Generate a plan first before saving", variant: "destructive" });
      return;
    }

    setSavingPlan(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        toast({ title: "Authentication required", description: "Please log in to save plans", variant: "destructive" });
        return;
      }

      const planData = {
        user_id: session.user.id,
        restaurant_id: restaurant?.id || 'none',
        restaurant_name: restaurant?.name || 'None',
        restaurant_cuisine: restaurant?.cuisine || '',
        activity_id: activity?.id || 'none',
        activity_name: activity?.name || 'None',
        activity_category: activity?.category || 'activity',
        search_params: { distances, userPreferences } as any,
      };

      const { error } = await supabase.from('saved_plans').insert(planData);
      if (error) throw error;

      setIsSaved(true);

      trackActivity({
        action_type: 'save_combo',
        restaurant_id: restaurant?.id,
        restaurant_name: restaurant?.name,
        restaurant_cuisine: restaurant?.cuisine,
        activity_id: activity?.id,
        activity_name: activity?.name,
        activity_category: activity?.category,
      });

      if (onSelectPlan && restaurant && activity) {
        onSelectPlan(restaurant, activity);
      }

      toast({ title: "Plan saved!", description: "You can view your saved plans in the history page" });
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({ title: "Error", description: "Failed to save plan", variant: "destructive" });
    } finally {
      setSavingPlan(false);
    }
  };

  if (!restaurant && !activity) return null;

  const canSave =
    (searchMode === 'both' && !!restaurant && !!activity) ||
    (searchMode === 'restaurant_only' && !!restaurant) ||
    (searchMode === 'activity_only' && !!activity);

  return (
    <Card className="mb-8 border-2 border-primary/20 shadow-lg bg-gradient-to-br from-card to-card/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Tonight's Plan
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSavePlan}
              variant={isSaved ? "secondary" : "default"}
              size="sm"
              disabled={savingPlan || !canSave}
              className="gap-2"
            >
              {savingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />}
              {isSaved ? 'Saved' : 'Save Plan'}
            </Button>
            <Button onClick={onReroll} variant="outline" size="sm" disabled={loading} className="gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Start Fresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Restaurant Section */}
        {restaurant && searchMode !== 'activity_only' && (
          <VenueCard
            place={restaurant}
            type="restaurant"
            distance={distances.toRestaurant}
            onSwap={onSwapRestaurant}
            onSkip={onSkipRestaurant}
            loading={loading}
            canSwap={canSwapRestaurant}
            userPreferences={userPreferences}
          />
        )}

        {/* Connection Arrow */}
        {restaurant && activity && searchMode === 'both' && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <ArrowRight className="w-5 h-5" />
            <div className="text-center">
              <span className="text-sm font-medium block">{distances.betweenPlaces.toFixed(1)} mi between venues</span>
              <span className="text-xs text-muted-foreground/70">
                ~{estimateTravelTime(distances.betweenPlaces)} drive
              </span>
            </div>
          </div>
        )}

        {/* Activity Section */}
        {activity && searchMode !== 'restaurant_only' && (
          <VenueCard
            place={activity}
            type="activity"
            distance={distances.toActivity}
            onSwap={onSwapActivity}
            onSkip={onSkipActivity}
            loading={loading}
            canSwap={canSwapActivity}
            userPreferences={userPreferences}
          />
        )}
      </CardContent>
    </Card>
  );
};
