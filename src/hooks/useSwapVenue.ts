import { useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { buildPlanFromIndices, scorePlaces } from "@/lib/planner";
import { usePlanStore } from "@/store/planStore";

/**
 * Hook for swapping individual restaurant/activity venues within cached results.
 * Handles both cycling through cached options and fetching fresh ones when exhausted.
 */
export const useSwapVenue = (
  userId: string | null,
  setPlan: (plan: any) => void,
  trackInteraction: (place: any, type: 'restaurant' | 'activity', interactionType: 'viewed' | 'selected' | 'skipped') => Promise<void>
) => {
  const swapDebounceRef = useRef<{ restaurant: boolean; activity: boolean }>({ restaurant: false, activity: false });

  const {
    lat, lng, radius, cuisine, activityCategory,
    searchMode, userPreferences,
    setRestaurants, setActivities,
    setRestaurantIdx: setRestaurantIndex,
    setActivityIdx: setActivityIndex,
    getCurrentRestaurants, getCurrentActivities,
    getCurrentRestaurantIdx, getCurrentActivityIdx,
  } = usePlanStore();

  const getPrefs = () =>
    userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0
      ? userPreferences
      : undefined;

  const handleSwapRestaurant = async () => {
    if (swapDebounceRef.current.restaurant) return;
    swapDebounceRef.current.restaurant = true;
    setTimeout(() => { swapDebounceRef.current.restaurant = false; }, 300);

    const restaurantResults = getCurrentRestaurants();
    const restaurantIndex = getCurrentRestaurantIdx();
    const activityResults = getCurrentActivities();
    const activityIndex = getCurrentActivityIdx();

    if (restaurantResults[restaurantIndex]) {
      await trackInteraction(restaurantResults[restaurantIndex], 'restaurant', 'skipped');
    }

    if (lat === null || lng === null) return;

    if (restaurantIndex + 1 < restaurantResults.length) {
      const newIndex = restaurantIndex + 1;
      setRestaurantIndex(newIndex);
      
      const newPlan = buildPlanFromIndices(
        { lat, lng, radius, restaurants: restaurantResults, activities: activityResults, preferences: getPrefs(), searchMode: searchMode || 'both' },
        newIndex, activityIndex
      );
      setPlan(newPlan);
      if (newPlan.restaurant) await trackInteraction(newPlan.restaurant, 'restaurant', 'viewed');
    } else {
      console.log('🔄 Exhausted restaurant options, fetching fresh');
      const randomSeed = Math.floor(Math.random() * 1000000);
      const { priceLevel } = usePlanStore.getState();
      
      try {
        const { data, error } = await supabase.functions.invoke('places-search', {
          body: { lat, lng, radiusMiles: radius, cuisine, priceLevel: priceLevel || undefined, seed: randomSeed, searchMode: searchMode || 'both', forceFresh: true }
        });
        
        if (!error && data?.items?.length > 0) {
          const sorted = scorePlaces(data.items, lat, lng, radius, getPrefs(), 'restaurant');
          setRestaurants(sorted, null);
          setRestaurantIndex(0);
          const newPlan = buildPlanFromIndices(
            { lat, lng, radius, restaurants: sorted, activities: activityResults, preferences: getPrefs(), searchMode: searchMode || 'both' },
            0, activityIndex
          );
          setPlan(newPlan);
          toast({ title: "Fresh picks!", description: "Found new restaurant options" });
        } else {
          toast({ title: "End of list", description: "No more options in this area", variant: "destructive" });
        }
      } catch (error) {
        console.error('Error fetching fresh restaurants:', error);
        toast({ title: "End of list", description: "Try rerolling for fresh options", variant: "destructive" });
      }
    }
  };

  const handleSwapActivity = async () => {
    if (swapDebounceRef.current.activity) return;
    swapDebounceRef.current.activity = true;
    setTimeout(() => { swapDebounceRef.current.activity = false; }, 300);

    const restaurantResults = getCurrentRestaurants();
    const restaurantIndex = getCurrentRestaurantIdx();
    const activityResults = getCurrentActivities();
    const activityIndex = getCurrentActivityIdx();

    if (activityResults[activityIndex]) {
      await trackInteraction(activityResults[activityIndex], 'activity', 'skipped');
    }

    if (lat === null || lng === null) return;

    if (activityIndex + 1 < activityResults.length) {
      const newIndex = activityIndex + 1;
      setActivityIndex(newIndex);
      
      const newPlan = buildPlanFromIndices(
        { lat, lng, radius, restaurants: restaurantResults, activities: activityResults, preferences: getPrefs(), searchMode: searchMode || 'both' },
        restaurantIndex, newIndex
      );
      setPlan(newPlan);
      if (newPlan.activity) await trackInteraction(newPlan.activity, 'activity', 'viewed');
    } else {
      console.log('🔄 Exhausted activity options, fetching fresh');
      const randomSeed = Math.floor(Math.random() * 1000000);
      
      try {
        const { data, error } = await supabase.functions.invoke('activities-search', {
          body: { lat, lng, radiusMiles: radius, keyword: activityCategory, seed: randomSeed, forceFresh: true }
        });
        
        if (!error && data?.items?.length > 0) {
          const sorted = scorePlaces(data.items, lat, lng, radius, getPrefs(), 'activity');
          setActivities(sorted, null);
          setActivityIndex(0);
          const newPlan = buildPlanFromIndices(
            { lat, lng, radius, restaurants: restaurantResults, activities: sorted, preferences: getPrefs(), searchMode: searchMode || 'both' },
            restaurantIndex, 0
          );
          setPlan(newPlan);
          toast({ title: "Fresh picks!", description: "Found new activity options" });
        } else {
          toast({ title: "End of list", description: "No more options in this area", variant: "destructive" });
        }
      } catch (error) {
        console.error('Error fetching fresh activities:', error);
        toast({ title: "End of list", description: "Try rerolling for fresh options", variant: "destructive" });
      }
    }
  };

  return { handleSwapRestaurant, handleSwapActivity };
};
