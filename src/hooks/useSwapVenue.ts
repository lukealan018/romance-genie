import { useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { buildPlanFromIndices, scorePlaces } from "@/lib/planner";
import { usePlanStore } from "@/store/planStore";

/**
 * Hook for swapping individual restaurant/activity venues within cached results.
 * Cycles through cached options in a loop (wrap-around).
 */
export const useSwapVenue = (
  userId: string | null,
  setPlan: (plan: any) => void,
  trackInteraction: (place: any, type: 'restaurant' | 'activity', interactionType: 'viewed' | 'selected' | 'skipped') => Promise<void>
) => {
  const swapDebounceRef = useRef<{ restaurant: boolean; activity: boolean }>({ restaurant: false, activity: false });

  const {
    lat, lng, radius,
    searchMode, userPreferences,
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

    if (restaurantResults.length <= 1) {
      toast({ title: "Only option", description: "This is the only restaurant in this area" });
      return;
    }

    if (restaurantResults[restaurantIndex]) {
      await trackInteraction(restaurantResults[restaurantIndex], 'restaurant', 'skipped');
    }

    if (lat === null || lng === null) return;

    const newIndex = (restaurantIndex + 1) % restaurantResults.length;
    setRestaurantIndex(newIndex);

    const newPlan = buildPlanFromIndices(
      { lat, lng, radius, restaurants: restaurantResults, activities: activityResults, preferences: getPrefs(), searchMode: searchMode || 'both' },
      newIndex, activityIndex
    );
    setPlan(newPlan);
    if (newPlan.restaurant) await trackInteraction(newPlan.restaurant, 'restaurant', 'viewed');
  };

  const handleSwapActivity = async () => {
    if (swapDebounceRef.current.activity) return;
    swapDebounceRef.current.activity = true;
    setTimeout(() => { swapDebounceRef.current.activity = false; }, 300);

    const restaurantResults = getCurrentRestaurants();
    const restaurantIndex = getCurrentRestaurantIdx();
    const activityResults = getCurrentActivities();
    const activityIndex = getCurrentActivityIdx();

    if (activityResults.length <= 1) {
      toast({ title: "Only option", description: "This is the only activity in this area" });
      return;
    }

    if (activityResults[activityIndex]) {
      await trackInteraction(activityResults[activityIndex], 'activity', 'skipped');
    }

    if (lat === null || lng === null) return;

    const newIndex = (activityIndex + 1) % activityResults.length;
    setActivityIndex(newIndex);

    const newPlan = buildPlanFromIndices(
      { lat, lng, radius, restaurants: restaurantResults, activities: activityResults, preferences: getPrefs(), searchMode: searchMode || 'both' },
      restaurantIndex, newIndex
    );
    setPlan(newPlan);
    if (newPlan.activity) await trackInteraction(newPlan.activity, 'activity', 'viewed');
  };

  return { handleSwapRestaurant, handleSwapActivity };
};
