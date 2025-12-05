import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomButton from "@/components/CustomButton";
import { PlanCard } from "@/components/PlanCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { buildPlanFromIndices, scorePlaces } from "@/lib/planner";
import { usePlanStore } from "@/store/planStore";
import { isDevModeActive } from "@/lib/dev-utils";
import { ScheduleVoiceDialog } from "@/components/ScheduleVoiceDialog";

const PlanPage = () => {
  const navigate = useNavigate();
  const swapDebounceRef = useRef<{ restaurant: boolean; activity: boolean }>({ restaurant: false, activity: false });
  const [userId, setUserId] = useState<string | null>(null);

  // Get state from global store - use mode-aware getters
  const {
    lat,
    lng,
    radius,
    cuisine,
    activityCategory,
    locationMode,
    zipCode,
    userPreferences,
    lastSearchedCuisine,
    lastSearchedActivity,
    searchMode,
    setRestaurants,
    setActivities,
    setRestaurantIdx: setRestaurantIndex,
    setActivityIdx: setActivityIndex,
    getCurrentRestaurants,
    getCurrentActivities,
    getCurrentRestaurantIdx,
    getCurrentActivityIdx,
    getNextRestaurantsToken,
    getNextActivitiesToken,
  } = usePlanStore();

  // Use mode-aware getters
  const restaurantResults = getCurrentRestaurants();
  const activityResults = getCurrentActivities();
  const restaurantIndex = getCurrentRestaurantIdx();
  const activityIndex = getCurrentActivityIdx();
  const nextRestaurantsToken = getNextRestaurantsToken();
  const nextActivitiesToken = getNextActivitiesToken();

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  // Get user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (session?.user) {
        setUserId(session.user.id);
      }
    };
    getUser();
  }, []);

  // Track user interactions
  const trackInteraction = async (
    place: any,
    type: 'restaurant' | 'activity',
    interactionType: 'viewed' | 'selected' | 'skipped'
  ) => {
    if (!userId || isDevModeActive()) return;
    
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
      console.log(`Tracked ${interactionType} for ${type}:`, place.name);
    } catch (error) {
      console.error('Error tracking interaction:', error);
    }
  };

  // Redirect to home if no data available (mode-aware) - DELAYED to allow store to populate
  useEffect(() => {
    // Add delay to allow store data to populate after navigation
    const timer = setTimeout(() => {
      const currentMode = searchMode || 'both';
      const needsRestaurants = currentMode === 'both' || currentMode === 'restaurant_only';
      const needsActivities = currentMode === 'both' || currentMode === 'activity_only';
      
      console.log('🔍 [PlanPage] Checking data availability:', {
        mode: currentMode,
        restaurants: restaurantResults.length,
        activities: activityResults.length,
        needsRestaurants,
        needsActivities
      });
      
      const missingData = 
        (needsRestaurants && restaurantResults.length === 0) ||
        (needsActivities && activityResults.length === 0);
      
      if (missingData) {
        console.log('❌ [PlanPage] No plan data available for current mode, redirecting to home');
        navigate('/');
      } else {
        console.log('✅ [PlanPage] Data available, staying on page');
      }
    }, 50); // 50ms delay to allow store to populate
    
    return () => clearTimeout(timer);
  }, [restaurantResults, activityResults, searchMode, navigate]);

  // Build plan from current indices whenever data changes (mode-aware)
  useEffect(() => {
    const currentMode = searchMode || 'both';
    const hasRestaurants = restaurantResults.length > 0;
    const hasActivities = activityResults.length > 0;
    
    // Check if we have the data needed for the current mode
    const hasRequiredData = 
      (currentMode === 'both' && hasRestaurants && hasActivities) ||
      (currentMode === 'restaurant_only' && hasRestaurants) ||
      (currentMode === 'activity_only' && hasActivities);
    
    if (hasRequiredData && lat !== null && lng !== null) {
      console.log('🏗️ [PlanPage] Building plan with:', { 
        mode: currentMode,
        restaurantCount: restaurantResults.length, 
        activityCount: activityResults.length,
        restaurantIndex,
        activityIndex 
      });
      
      const newPlan = buildPlanFromIndices(
        {
          lat,
          lng,
          radius,
          restaurants: restaurantResults,
          activities: activityResults,
          preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 
            ? userPreferences 
            : undefined,
          searchMode: currentMode,
        },
        restaurantIndex,
        activityIndex
      );
      
      console.log('✅ [PlanPage] Plan built:', {
        hasRestaurant: !!newPlan.restaurant,
        hasActivity: !!newPlan.activity,
        restaurantName: newPlan.restaurant?.name,
        activityName: newPlan.activity?.name
      });
      setPlan(newPlan);
    } else {
      console.log('⚠️ [PlanPage] Cannot build plan - missing required data:', {
        hasRequiredData,
        lat,
        lng
      });
    }
  }, [restaurantResults, activityResults, restaurantIndex, activityIndex, lat, lng, radius, userPreferences, searchMode]);

  const handleSwapRestaurant = async () => {
    if (swapDebounceRef.current.restaurant) return;
    swapDebounceRef.current.restaurant = true;
    setTimeout(() => { swapDebounceRef.current.restaurant = false; }, 300);

    // Check mode - don't swap if mode doesn't include restaurants
    const currentMode = searchMode || 'both';
    if (currentMode === 'activity_only') {
      console.log('⚠️ Swap restaurant blocked: mode is activity_only');
      return;
    }

    // Use coordinates from store (already geocoded during initial search)
    if (lat === null || lng === null) return;
    const searchLat = lat;
    const searchLng = lng;

    if (restaurantIndex + 1 < restaurantResults.length) {
      const newIndex = restaurantIndex + 1;
      setRestaurantIndex(newIndex);
      
      const newPlan = buildPlanFromIndices(
        { lat: searchLat, lng: searchLng, radius, restaurants: restaurantResults, activities: activityResults,
          preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 ? userPreferences : undefined },
        newIndex, activityIndex
      );
      setPlan(newPlan);
      return;
    }

    if (nextRestaurantsToken) {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('places-search', {
          body: { lat: searchLat, lng: searchLng, radiusMiles: radius, cuisine, pagetoken: nextRestaurantsToken }
        });
        if (error) throw error;

        const newRestaurants = [...restaurantResults, ...(data.items || [])];
        const sortedRestaurants = scorePlaces(newRestaurants, searchLat, searchLng, radius,
          userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 ? userPreferences : undefined, 'restaurant');
        
        setRestaurants(sortedRestaurants, data.nextPageToken || null);
        const newIndex = restaurantIndex + 1;
        setRestaurantIndex(newIndex);

        const newPlan = buildPlanFromIndices(
          { lat: searchLat, lng: searchLng, radius, restaurants: newRestaurants, activities: activityResults,
            preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 ? userPreferences : undefined },
          newIndex, activityIndex
        );
        setPlan(newPlan);
        toast({ title: "Success", description: "Loaded more restaurants!" });
      } catch (error) {
        toast({ title: "Error", description: "Failed to load more restaurants.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    } else {
      setRestaurantIndex(0);
      const newPlan = buildPlanFromIndices(
        { lat: searchLat, lng: searchLng, radius, restaurants: restaurantResults, activities: activityResults,
          preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 ? userPreferences : undefined },
        0, activityIndex
      );
      setPlan(newPlan);
    }
  };

  const handleSwapActivity = async () => {
    if (swapDebounceRef.current.activity) return;
    swapDebounceRef.current.activity = true;
    setTimeout(() => { swapDebounceRef.current.activity = false; }, 300);

    // Check mode - don't swap if mode doesn't include activities
    const currentMode = searchMode || 'both';
    if (currentMode === 'restaurant_only') {
      console.log('⚠️ Swap activity blocked: mode is restaurant_only');
      return;
    }

    // Use coordinates from store (already geocoded during initial search)
    if (lat === null || lng === null) return;
    const searchLat = lat;
    const searchLng = lng;

    if (activityIndex + 1 < activityResults.length) {
      const newIndex = activityIndex + 1;
      setActivityIndex(newIndex);
      
      const newPlan = buildPlanFromIndices(
        { lat: searchLat, lng: searchLng, radius, restaurants: restaurantResults, activities: activityResults,
          preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 ? userPreferences : undefined },
        restaurantIndex, newIndex
      );
      setPlan(newPlan);
      return;
    }

    if (nextActivitiesToken) {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('activities-search', {
          body: { lat: searchLat, lng: searchLng, radiusMiles: radius, keyword: activityCategory, pagetoken: nextActivitiesToken }
        });
        if (error) throw error;

        const newActivities = [...activityResults, ...(data.items || [])];
        const sortedActivities = scorePlaces(newActivities, searchLat, searchLng, radius,
          userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 ? userPreferences : undefined, 'activity');
        
        setActivities(sortedActivities, data.nextPageToken || null);
        const newIndex = activityIndex + 1;
        setActivityIndex(newIndex);

        const newPlan = buildPlanFromIndices(
          { lat: searchLat, lng: searchLng, radius, restaurants: restaurantResults, activities: newActivities,
            preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 ? userPreferences : undefined },
          restaurantIndex, newIndex
        );
        setPlan(newPlan);
        toast({ title: "Success", description: "Loaded more activities!" });
      } catch (error) {
        toast({ title: "Error", description: "Failed to load more activities.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    } else {
      setActivityIndex(0);
      const newPlan = buildPlanFromIndices(
        { lat: searchLat, lng: searchLng, radius, restaurants: restaurantResults, activities: activityResults,
          preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 ? userPreferences : undefined },
        restaurantIndex, 0
      );
      setPlan(newPlan);
    }
  };

  const handleReroll = () => {
    // Reset to original plan (first restaurant and first activity)
    setRestaurantIndex(0);
    setActivityIndex(0);
    
    if (lat !== null && lng !== null) {
      const newPlan = buildPlanFromIndices(
        { 
          lat, 
          lng, 
          radius, 
          restaurants: restaurantResults, 
          activities: activityResults,
          preferences: userPreferences.cuisines.length > 0 || userPreferences.activities.length > 0 ? userPreferences : undefined 
        },
        0, 
        0
      );
      setPlan(newPlan);
    }
  };

  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your plan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px'}}>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <span className="text-lg font-semibold">Tonight's Plan</span>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="secondary" size="sm" onClick={() => navigate('/profile')}>Profile</Button>
        </div>
      </header>

      {/* Content */}
      <div className="container max-w-2xl py-6 space-y-6">
        {/* Plan Card */}
        <PlanCard
          restaurant={plan.restaurant}
          activity={plan.activity}
          distances={plan.distances}
          onSwapRestaurant={handleSwapRestaurant}
          onSwapActivity={handleSwapActivity}
          onReroll={handleReroll}
          onSkipRestaurant={(restaurant) => {
            trackInteraction(
              { ...restaurant, cuisine: lastSearchedCuisine },
              'restaurant',
              'skipped'
            );
          }}
          onSkipActivity={(activity) => {
            trackInteraction(
              { ...activity, category: lastSearchedActivity },
              'activity',
              'skipped'
            );
          }}
          onSelectPlan={(restaurant, activity) => {
            trackInteraction(
              { ...restaurant, cuisine: lastSearchedCuisine },
              'restaurant',
              'selected'
            );
            trackInteraction(
              { ...activity, category: lastSearchedActivity },
              'activity',
              'selected'
            );
          }}
          loading={loading}
          canSwapRestaurant={restaurantIndex + 1 < restaurantResults.length || !!nextRestaurantsToken}
          canSwapActivity={activityIndex + 1 < activityResults.length || !!nextActivitiesToken}
          searchMode={searchMode || 'both'}
        />

        {/* Swap Buttons - Conditionally render based on mode */}
        {(searchMode === 'both' || searchMode === 'restaurant_only' || !searchMode) && (searchMode === 'both' || searchMode === 'activity_only' || !searchMode) ? (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
            {(searchMode !== 'activity_only') && (
              <CustomButton
                variant="secondary"
                onClick={handleSwapRestaurant}
                disabled={loading || (!restaurantResults[restaurantIndex + 1] && !nextRestaurantsToken)}
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Swap Food"}
              </CustomButton>
            )}
            {(searchMode !== 'restaurant_only') && (
              <CustomButton
                variant="secondary"
                onClick={handleSwapActivity}
                disabled={loading || (!activityResults[activityIndex + 1] && !nextActivitiesToken)}
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Swap Activity"}
              </CustomButton>
            )}
          </div>
        ) : (
          <CustomButton
            variant="secondary"
            onClick={searchMode === 'restaurant_only' ? handleSwapRestaurant : handleSwapActivity}
            disabled={loading || (searchMode === 'restaurant_only' 
              ? (!restaurantResults[restaurantIndex + 1] && !nextRestaurantsToken)
              : (!activityResults[activityIndex + 1] && !nextActivitiesToken)
            )}
            full
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : 
              searchMode === 'restaurant_only' ? "Swap Food" : "Swap Activity"}
          </CustomButton>
        )}

        {/* Schedule Button */}
        <CustomButton
          variant="primary"
          onClick={() => setShowScheduleDialog(true)}
          full
        >
          {searchMode === 'restaurant_only' && "Schedule This Dinner"}
          {searchMode === 'activity_only' && "Schedule This Activity"}
          {(!searchMode || searchMode === 'both') && "Schedule This Plan"}
        </CustomButton>
      </div>

      {/* Schedule Dialog */}
      <ScheduleVoiceDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        planDetails={{
          restaurant: plan?.restaurant,
          activity: plan?.activity
        }}
        searchMode={searchMode}
      />
    </div>
  );
};

export default PlanPage;
