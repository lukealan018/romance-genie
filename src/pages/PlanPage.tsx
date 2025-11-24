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

  // Get state from global store
  const {
    lat,
    lng,
    radius,
    cuisine,
    activityCategory,
    locationMode,
    zipCode,
    restaurants: restaurantResults,
    activities: activityResults,
    restaurantIdx: restaurantIndex,
    activityIdx: activityIndex,
    nextRestaurantsToken,
    nextActivitiesToken,
    userPreferences,
    lastSearchedCuisine,
    lastSearchedActivity,
    setRestaurants,
    setActivities,
    setRestaurantIdx: setRestaurantIndex,
    setActivityIdx: setActivityIndex,
  } = usePlanStore();

  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);

  // Get user ID
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
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

  // Redirect to home if no data available
  useEffect(() => {
    if (restaurantResults.length === 0 || activityResults.length === 0) {
      console.log('No plan data available, redirecting to home');
      navigate('/');
    }
  }, [restaurantResults, activityResults, navigate]);

  // Build plan from current indices whenever data changes
  useEffect(() => {
    if (restaurantResults.length > 0 && activityResults.length > 0 && lat !== null && lng !== null) {
      console.log('Building plan with:', { 
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
        },
        restaurantIndex,
        activityIndex
      );
      
      console.log('Plan built:', newPlan);
      setPlan(newPlan);
    }
  }, [restaurantResults, activityResults, restaurantIndex, activityIndex, lat, lng, radius, userPreferences]);

  const handleSwapRestaurant = async () => {
    if (swapDebounceRef.current.restaurant) return;
    swapDebounceRef.current.restaurant = true;
    setTimeout(() => { swapDebounceRef.current.restaurant = false; }, 300);

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
        <div className="h1">Lovable</div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="secondary" size="sm" onClick={() => navigate('/profile')}>Profile</Button>
        </div>
      </header>

      {/* Content */}
      <div className="container max-w-2xl py-6 space-y-6">
        {/* Plan Card */}
        {(searchMode === 'both' || searchMode === 'restaurant_only') && plan?.restaurant && (
          <PlanCard
            type="restaurant"
            place={plan.restaurant}
            onSwap={handleSwapRestaurant}
            onSkip={(restaurant) => {
              trackInteraction(
                { ...restaurant, cuisine: lastSearchedCuisine },
                'restaurant',
                'skipped'
              );
            }}
            loading={loading}
            canSwap={restaurantIndex + 1 < restaurantResults.length || !!nextRestaurantsToken}
          />
        )}
        
        {(searchMode === 'both' || searchMode === 'activity_only') && plan?.activity && (
          <PlanCard
            type="activity"
            place={plan.activity}
            onSwap={handleSwapActivity}
            onSkip={(activity) => {
              trackInteraction(
                { ...activity, category: lastSearchedActivity },
                'activity',
                'skipped'
              );
            }}
            loading={loading}
            canSwap={activityIndex + 1 < activityResults.length || !!nextActivitiesToken}
          />
        )}

        {/* Swap Buttons */}
        {searchMode === 'both' && (
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
            <CustomButton
              variant="secondary"
              onClick={handleSwapRestaurant}
              disabled={loading || (!restaurantResults[restaurantIndex + 1] && !nextRestaurantsToken)}
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Swap Food"}
            </CustomButton>
            <CustomButton
              variant="secondary"
              onClick={handleSwapActivity}
              disabled={loading || (!activityResults[activityIndex + 1] && !nextActivitiesToken)}
            >
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Swap Activity"}
            </CustomButton>
          </div>
        )}
        
        {searchMode === 'restaurant_only' && (
          <CustomButton
            variant="secondary"
            onClick={handleSwapRestaurant}
            disabled={loading || (!restaurantResults[restaurantIndex + 1] && !nextRestaurantsToken)}
            full
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Next Restaurant"}
          </CustomButton>
        )}
        
        {searchMode === 'activity_only' && (
          <CustomButton
            variant="secondary"
            onClick={handleSwapActivity}
            disabled={loading || (!activityResults[activityIndex + 1] && !nextActivitiesToken)}
            full
          >
            {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Next Activity"}
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
          {searchMode === 'both' && "Schedule This Plan"}
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
      />
    </div>
  );
};

export default PlanPage;
