import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { buildPlan, scorePlaces } from "@/lib/planner";
import { getLearnedPreferences, getContextualSuggestions } from "@/lib/learning";
import { usePlanStore, buildSearchSignature } from "@/store/planStore";

/**
 * Hook for the "Surprise Me" feature — pure random discovery without profile preferences.
 */
export const useSurpriseMe = (
  userId: string | null,
  setPlan: (plan: any) => void,
  handleUseCurrentLocation: (silent: boolean) => Promise<void>,
  onSearchSuccess?: () => void
) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [nextAvailableDateInfo, setNextAvailableDateInfo] = useState<{ date: string; dayName: string } | null>(null);

  const {
    lat, lng, radius, searchMode, searchDate, zipCode, userPreferences,
    setLocation, setFilters, setRestaurants, setActivities,
    setRestaurantIdx: setRestaurantIndex, setActivityIdx: setActivityIndex,
    setLastSearched, setSearchSignature, clearAllResults,
  } = usePlanStore();

  const handleSurpriseMe = async (options?: { liveEventsOnly?: boolean }) => {
    const liveEventsOnly = options?.liveEventsOnly ?? false;
    clearAllResults();
    
    const surpriseRadius = liveEventsOnly ? 25 : 5;
    
    let searchLat = lat;
    let searchLng = lng;
    
    if (!searchLat || !searchLng) {
      try {
        await handleUseCurrentLocation(true);
        const storeState = usePlanStore.getState();
        searchLat = storeState.lat;
        searchLng = storeState.lng;
      } catch (error) {
        console.error('GPS error in SurpriseMe:', error);
      }
      
      if ((!searchLat || !searchLng) && zipCode && /^\d{5}$/.test(zipCode.trim())) {
        try {
          const { data: geocodeData } = await supabase.functions.invoke('geocode', {
            body: { zipCode: zipCode.trim() }
          });
          if (geocodeData?.lat && geocodeData?.lng) {
            searchLat = geocodeData.lat;
            searchLng = geocodeData.lng;
            setLocation(searchLat, searchLng);
            toast({ title: "Using home location", description: `Searching near ${geocodeData.city || zipCode}` });
          }
        } catch (error) {
          console.error('Geocoding error in SurpriseMe:', error);
        }
      }
      
      if (!searchLat || !searchLng) {
        toast({ title: "Location Required", description: "Please set your location or ZIP code first", variant: "destructive" });
        return;
      }
    }
    
    const { venueType: currentVenueType } = usePlanStore.getState();
    
    const cuisineOptions = [
      "omakase", "tasting menu", "supper club", "chef's table",
      "farm to table", "wine bar", "tapas", "izakaya",
      "Ethiopian", "Peruvian", "Korean BBQ", "Vietnamese pho"
    ];
    const activityOptions = [
      "speakeasy", "rooftop bar", "jazz lounge", "tiki bar", "whiskey bar",
      "axe throwing", "paint and sip", "pottery class",
      "wine tasting", "escape room", "comedy club", "karaoke",
      "art gallery", "theater", "hookah lounge", "pool hall",
      "food hall", "arcade bar", "board game cafe", "trivia night"
    ];
    
    const isCoffeeMode = currentVenueType === 'coffee';
    const selectedCuisine = isCoffeeMode ? 'coffee' : cuisineOptions[Math.floor(Math.random() * cuisineOptions.length)];
    const selectedActivity = activityOptions[Math.floor(Math.random() * activityOptions.length)];
    
    const cuisineLabel = isCoffeeMode ? 'coffee shops' : `${selectedCuisine} spots`;
    toast({
      title: "✨ Surprise!",
      description: `Finding hidden gem ${cuisineLabel} and ${selectedActivity.replace('_', ' ')} nearby...`,
      duration: 3000,
    });
    
    setLoading(true);
    try {
      let weatherData = null;
      try {
        const { data: weather, error: weatherError } = await supabase.functions.invoke('weather', {
          body: { lat: searchLat, lng: searchLng }
        });
        if (!weatherError && weather) weatherData = weather;
      } catch (weatherError) {
        console.error('Failed to fetch weather:', weatherError);
      }
      
      const contextual = getContextualSuggestions({ weather: weatherData });
      const learnedPrefs = userId ? await getLearnedPreferences(userId) : undefined;
      
      const currentMode = searchMode || 'both';
      const randomSeed = Math.floor(Math.random() * 1000000);

      const restaurantsPromise = (currentMode === 'both' || currentMode === 'restaurant_only')
        ? supabase.functions.invoke('places-search', {
            body: {
              lat: searchLat, lng: searchLng, radiusMiles: surpriseRadius,
              cuisine: isCoffeeMode ? '' : selectedCuisine,
              venueType: isCoffeeMode ? 'coffee' : 'any',
              searchMode: currentMode, noveltyMode: 'hidden_gems',
              seed: randomSeed, forceFresh: true, voiceTriggered: true, surpriseMe: true
            }
          })
        : Promise.resolve({ data: { items: [] }, error: null });

      const today = new Date();
      const searchDateStr = today.toISOString().split('T')[0];
      
      const activitiesPromise = (currentMode === 'both' || currentMode === 'activity_only')
        ? supabase.functions.invoke('activities-search', {
            body: {
              lat: searchLat, lng: searchLng, radiusMiles: surpriseRadius,
              keyword: selectedActivity, noveltyMode: 'hidden_gems',
              seed: randomSeed, forceFresh: true, voiceTriggered: true, surpriseMe: true,
              liveEventsOnly,
              searchDate: liveEventsOnly ? searchDateStr : undefined,
              findNextAvailable: liveEventsOnly,
            }
          })
        : Promise.resolve({ data: { items: [] }, error: null });

      const [restaurantsResponse, activitiesResponse] = await Promise.all([restaurantsPromise, activitiesPromise]);

      if (restaurantsResponse.error) throw restaurantsResponse.error;
      if (activitiesResponse.error) throw activitiesResponse.error;

      const restaurants = restaurantsResponse.data?.items || [];
      const activities = activitiesResponse.data?.items || [];
      
      if (liveEventsOnly && activities.length === 0) {
        const nextDate = activitiesResponse.data?.nextAvailableDate;
        const nextDayName = activitiesResponse.data?.nextAvailableDayName;
        
        if (nextDate && nextDayName) {
          setNextAvailableDateInfo({ date: nextDate, dayName: nextDayName });
          setLoading(false);
          return;
        } else {
          toast({ title: "No live events found", description: "No upcoming events in your area for the next 2 weeks.", variant: "destructive", duration: 5000 });
          setLoading(false);
          return;
        }
      }
      
      const sortedRestaurants = scorePlaces(restaurants, searchLat, searchLng, surpriseRadius, undefined, 'restaurant', learnedPrefs);
      const sortedActivities = scorePlaces(activities, searchLat, searchLng, surpriseRadius, undefined, 'activity', learnedPrefs);
      
      setRestaurants(sortedRestaurants, restaurantsResponse.data?.nextPageToken || null);
      setActivities(sortedActivities, activitiesResponse.data?.nextPageToken || null);
      setLastSearched(selectedCuisine, selectedActivity);
      
      const newSignature = buildSearchSignature({
        mode: currentMode, cuisine: selectedCuisine, activityCategory: selectedActivity,
        radius: surpriseRadius, priceLevel: null, searchDate, lat: searchLat, lng: searchLng, seed: randomSeed,
      });
      setSearchSignature(newSignature);

      const initialPlan = buildPlan({
        lat: searchLat, lng: searchLng, radius: surpriseRadius,
        restaurants: sortedRestaurants, activities: sortedActivities,
        preferences: undefined, learnedPreferences: learnedPrefs,
        contextualHints: {
          indoorPreference: contextual.indoorPreference,
          energyLevel: contextual.message.toLowerCase().includes('chill') || contextual.message.toLowerCase().includes('unwind')
            ? 'low'
            : contextual.message.toLowerCase().includes('lively') || contextual.message.toLowerCase().includes('active')
            ? 'high' : 'medium',
        },
        searchMode: currentMode,
      });

      const selectedRestaurantIndex = initialPlan.restaurant ? sortedRestaurants.findIndex(r => r.id === initialPlan.restaurant?.id) : 0;
      const selectedActivityIndex = initialPlan.activity ? sortedActivities.findIndex(a => a.id === initialPlan.activity?.id) : 0;

      setRestaurantIndex(selectedRestaurantIndex >= 0 ? selectedRestaurantIndex : 0);
      setActivityIndex(selectedActivityIndex >= 0 ? selectedActivityIndex : 0);
      
      setPlan(initialPlan);
      setFilters({ cuisine: selectedCuisine, activityCategory: selectedActivity });
      onSearchSuccess?.();

      setTimeout(() => { navigate("/plan", { replace: true }); }, 100);
    } catch (error) {
      console.error('Error in surprise me:', error);
      toast({ title: "Error", description: "Failed to find places. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchWithDate = useCallback(async (targetDate: string) => {
    setNextAvailableDateInfo(null);
    const { setSearchDate } = usePlanStore.getState();
    setSearchDate(new Date(targetDate + 'T12:00:00'));
    await handleSurpriseMe({ liveEventsOnly: true });
  }, [handleSurpriseMe]);

  const handleDismissNextAvailableDate = useCallback(() => {
    setNextAvailableDateInfo(null);
  }, []);

  return {
    loading,
    handleSurpriseMe,
    nextAvailableDateInfo,
    handleSearchWithDate,
    handleDismissNextAvailableDate,
  };
};
