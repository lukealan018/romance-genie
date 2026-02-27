import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useManualSearch } from "./useManualSearch";
import { useSurpriseMe } from "./useSurpriseMe";
import { useSwapVenue } from "./useSwapVenue";

/**
 * Orchestrator hook that composes useManualSearch, useSurpriseMe, and useSwapVenue.
 * Maintains the same public API as the original monolithic hook for backward compatibility.
 */
export const usePlaceSearch = (
  userId: string | null,
  saveLocationSettings: (radius: number, zipCode: string, immediate: boolean) => Promise<void>,
  onSearchSuccess?: () => void
) => {
  const [plan, setPlan] = useState<any>(null);
  const [searchType, setSearchType] = useState<"restaurants" | "activities">("restaurants");

  // Track user interactions (shared across sub-hooks)
  const trackInteraction = async (
    place: any,
    type: 'restaurant' | 'activity',
    interactionType: 'viewed' | 'selected' | 'skipped'
  ) => {
    if (!userId) return;
    try {
      await supabase.from('user_interactions').insert({
        user_id: userId,
        place_id: place.id,
        place_name: place.name,
        place_type: type,
        interaction_type: interactionType,
        cuisine: place.cuisine,
        category: place.category,
        rating: place.rating,
      });
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  };

  const manual = useManualSearch(userId, saveLocationSettings, trackInteraction, setPlan, onSearchSuccess);
  const surprise = useSurpriseMe(userId, setPlan, manual.handleUseCurrentLocation, onSearchSuccess);
  const swap = useSwapVenue(userId, setPlan, trackInteraction);

  return {
    loading: manual.loading || surprise.loading,
    gettingLocation: manual.gettingLocation,
    plan,
    searchType,
    setSearchType,
    trackInteraction,
    handleUseCurrentLocation: manual.handleUseCurrentLocation,
    handleFindPlaces: manual.handleFindPlaces,
    handleSwapRestaurant: swap.handleSwapRestaurant,
    handleSwapActivity: swap.handleSwapActivity,
    handleReroll: manual.handleReroll,
    handleRerollPlan: manual.handleRerollPlan,
    handleSeePlan: manual.handleSeePlan,
    handleSurpriseMe: surprise.handleSurpriseMe,
    handleSelectRecentPlan: manual.handleSelectRecentPlan,
    // Next available date handling
    nextAvailableDateInfo: surprise.nextAvailableDateInfo,
    handleSearchWithDate: surprise.handleSearchWithDate,
    handleDismissNextAvailableDate: surprise.handleDismissNextAvailableDate,
  };
};
