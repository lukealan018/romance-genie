import { RefreshCw, ArrowRight, MapPin, Star, Phone, Loader2, ExternalLink, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getReservationLinks, getActivityLinks } from "@/lib/external-links";
import { PhotoGallery } from "@/components/PhotoGallery";
import { trackActivity } from '@/lib/activity-tracker';

// Estimate travel time based on distance
const estimateTravelTime = (miles: number) => {
  // Rough estimate: 2 minutes per mile in city traffic
  const minutes = Math.round(miles * 2);
  
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }
};

interface Place {
  id: string;
  name: string;
  rating: number;
  totalRatings: number;
  address: string;
  lat: number;
  lng: number;
  priceLevel?: string;
  city?: string;
  category?: 'event' | 'activity';
  source?: string; // 'google' | 'foursquare'
}

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
  const [restaurantPhone, setRestaurantPhone] = useState<string | null>(null);
  const [activityPhone, setActivityPhone] = useState<string | null>(null);
  const [restaurantWebsite, setRestaurantWebsite] = useState<string | null>(null);
  const [activityWebsite, setActivityWebsite] = useState<string | null>(null);
  const [loadingRestaurantPhone, setLoadingRestaurantPhone] = useState(false);
  const [loadingActivityPhone, setLoadingActivityPhone] = useState(false);
  const [userPreferences, setUserPreferences] = useState<{
    date?: Date;
    time?: Date;
    partySize?: number;
  }>({});
  const [savingPlan, setSavingPlan] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [restaurantPhotos, setRestaurantPhotos] = useState<any[]>([]);
  const [activityPhotos, setActivityPhotos] = useState<any[]>([]);
  const [weather, setWeather] = useState<{
    temperature: number;
    description: string;
    icon: string;
  } | null>(null);

  useEffect(() => {
    const fetchUserPreferences = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const { data: profile } = await supabase.functions.invoke('profile', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
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

  const fetchPlaceDetails = async (placeId: string, type: 'restaurant' | 'activity', source?: string) => {
    const setPhone = type === 'restaurant' ? setRestaurantPhone : setActivityPhone;
    const setWebsite = type === 'restaurant' ? setRestaurantWebsite : setActivityWebsite;
    const setPhotos = type === 'restaurant' ? setRestaurantPhotos : setActivityPhotos;
    const setLoading = type === 'restaurant' ? setLoadingRestaurantPhone : setLoadingActivityPhone;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('place-details', {
        body: { placeId, source }
      });

      if (error) throw error;
      
      if (data) {
        setPhone(data.phoneNumber || null);
        setWebsite(data.website || null);
        setPhotos(data.photos || []);
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
      toast({
        title: "Error",
        description: `Failed to fetch ${type} details`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWeather = async (lat: number, lng: number) => {
    try {
      const { data, error } = await supabase.functions.invoke('weather', {
        body: { lat, lng }
      });

      if (error) throw error;
      
      if (data) {
        setWeather(data);
      }
    } catch (error) {
      console.error('Error fetching weather:', error);
    }
  };

  useEffect(() => {
    if (restaurant) {
      fetchWeather(restaurant.lat, restaurant.lng);
    }
  }, [restaurant?.id]);

  const handleNavigate = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const handleSavePlan = async () => {
    if (!restaurant || !activity) {
      toast({
        title: "No plan to save",
        description: "Generate a plan first before saving",
        variant: "destructive"
      });
      return;
    }

    setSavingPlan(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Authentication required",
          description: "Please log in to save plans",
          variant: "destructive"
        });
        return;
      }

      const planData = {
        user_id: session.user.id,
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        restaurant_cuisine: restaurant.city || '',
        activity_id: activity.id,
        activity_name: activity.name,
        activity_category: activity.category || 'activity',
        search_params: {
          distances: distances,
          userPreferences: userPreferences
        } as any
      };

      const { error } = await supabase
        .from('saved_plans')
        .insert(planData);

      if (error) throw error;

      setIsSaved(true);
      
      // Track the save action
      trackActivity({
        action_type: 'save_combo',
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        restaurant_cuisine: restaurant.city,
        activity_id: activity.id,
        activity_name: activity.name,
        activity_category: activity.category
      });
      
      // Track selection for learning system
      if (onSelectPlan) {
        onSelectPlan(restaurant, activity);
      }
      
      toast({
        title: "Plan saved!",
        description: "You can view your saved plans in the history page",
      });
    } catch (error) {
      console.error('Error saving plan:', error);
      toast({
        title: "Error",
        description: "Failed to save plan",
        variant: "destructive"
      });
    } finally {
      setSavingPlan(false);
    }
  };

  // Fetch place details when places change
  useEffect(() => {
    if (restaurant?.id) {
      setRestaurantWebsite(null);
      setRestaurantPhotos([]);
      fetchPlaceDetails(restaurant.id, 'restaurant', restaurant.source);
    }
  }, [restaurant?.id]);

  useEffect(() => {
    if (activity?.id) {
      setActivityWebsite(null);
      setActivityPhotos([]);
      fetchPlaceDetails(activity.id, 'activity', activity.source);
    }
  }, [activity?.id]);

  if (!restaurant && !activity) {
    return null;
  }

  return (
    <Card className="mb-8 border-2 border-primary/20 shadow-lg bg-gradient-to-br from-card to-card/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Tonight's Plan
            </CardTitle>
            {weather && (
              <div className="flex items-center gap-2 text-sm">
                <img 
                  src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                  alt={weather.description}
                  className="w-8 h-8"
                />
                <span className="font-medium">{weather.temperature}°F</span>
                <span className="text-muted-foreground capitalize">{weather.description}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSavePlan}
              variant={isSaved ? "secondary" : "default"}
              size="sm"
              disabled={savingPlan || (searchMode === 'both' && (!restaurant || !activity)) || (searchMode === 'restaurant_only' && !restaurant) || (searchMode === 'activity_only' && !activity)}
              className="gap-2"
            >
              {savingPlan ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
              )}
              {isSaved ? 'Saved' : 'Save Plan'}
            </Button>
            <Button
              onClick={onReroll}
              variant="outline"
              size="sm"
              disabled={loading}
              className="gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Reroll
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Restaurant Section */}
        {restaurant && searchMode !== 'activity_only' && (
          <div className="bg-background rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Dinner</span>
                  <span className="text-xs text-muted-foreground">• {distances.toRestaurant.toFixed(1)} mi away</span>
                </div>
                {restaurantWebsite ? (
                  <a
                    href={restaurantWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-lg line-clamp-1 hover:text-primary transition-colors inline-flex items-center gap-1 group"
                  >
                    {restaurant.name}
                    <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ) : (
                  <h3 className="font-semibold text-lg line-clamp-1">{restaurant.name}</h3>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-accent text-accent" />
                    <span className="text-sm font-medium">{restaurant.rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({restaurant.totalRatings})</span>
                  </div>
                  {restaurant.priceLevel && (
                    <span className="text-sm font-medium">{restaurant.priceLevel}</span>
                  )}
                </div>
              </div>
      <Button 
        onClick={() => {
          trackActivity({
            action_type: 'swap_restaurant',
            restaurant_id: restaurant.id,
            restaurant_name: restaurant.name,
            restaurant_cuisine: restaurant.city,
            restaurant_price_level: restaurant.priceLevel
          });
          // Track skip for learning system
          if (onSkipRestaurant) {
            onSkipRestaurant(restaurant);
          }
          onSwapRestaurant();
        }} 
        variant="ghost" 
        size="sm" 
        disabled={loading || !canSwapRestaurant}
      >
        Swap
      </Button>
            </div>
            
            <div 
              className="flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
              onClick={() => handleNavigate(restaurant.lat, restaurant.lng)}
            >
              <MapPin className="w-4 h-4" />
              <span className="line-clamp-1">{restaurant.address}</span>
            </div>

            <PhotoGallery photos={restaurantPhotos} placeName={restaurant.name} />

            <div className="flex gap-2">
            {restaurantPhone ? (
              <a
                href={`tel:${restaurantPhone}`}
                onClick={(e) => {
                  e.preventDefault();
                  trackActivity({
                    action_type: 'call',
                    restaurant_id: restaurant.id,
                    restaurant_name: restaurant.name
                  });
                  window.location.href = `tel:${restaurantPhone}`;
                }}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
              >
                <Phone className="h-4 w-4" />
                <span>Call</span>
              </a>
              ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  trackActivity({
                    action_type: 'view_details',
                    restaurant_id: restaurant.id,
                    restaurant_name: restaurant.name
                  });
                  fetchPlaceDetails(restaurant.id, 'restaurant', restaurant.source);
                }}
                disabled={loadingRestaurantPhone}
                className="gap-2"
              >
                  {loadingRestaurantPhone ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                  Get Details
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Reserve
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {(() => {
                    const links = getReservationLinks(
                      {
                        name: restaurant.name,
                        city: restaurant.city,
                        lat: restaurant.lat,
                        lng: restaurant.lng,
                        address: restaurant.address,
                      },
                      userPreferences
                    );
                    return (
                    <>
                      <DropdownMenuItem asChild>
                        <a 
                          href={links.openTable} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="cursor-pointer"
                          onClick={() => trackActivity({
                            action_type: 'reserve',
                            restaurant_id: restaurant.id,
                            restaurant_name: restaurant.name
                          })}
                        >
                          OpenTable
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a 
                          href={links.resy} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="cursor-pointer"
                          onClick={() => trackActivity({
                            action_type: 'reserve',
                            restaurant_id: restaurant.id,
                            restaurant_name: restaurant.name
                          })}
                        >
                          Resy
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a 
                          href={links.yelp} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="cursor-pointer"
                          onClick={() => trackActivity({
                            action_type: 'reserve',
                            restaurant_id: restaurant.id,
                            restaurant_name: restaurant.name
                          })}
                        >
                          Yelp
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a 
                          href={links.googleMaps} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="cursor-pointer"
                          onClick={() => trackActivity({
                            action_type: 'reserve',
                            restaurant_id: restaurant.id,
                            restaurant_name: restaurant.name
                          })}
                        >
                          Google Maps
                        </a>
                      </DropdownMenuItem>
                    </>
                    );
                  })()}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
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
          <div className="bg-background rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Activity</span>
                  <span className="text-xs text-muted-foreground">• {distances.toActivity.toFixed(1)} mi away</span>
                </div>
                {activityWebsite ? (
                  <a
                    href={activityWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-lg line-clamp-1 hover:text-primary transition-colors inline-flex items-center gap-1 group"
                  >
                    {activity.name}
                    <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ) : (
                  <h3 className="font-semibold text-lg line-clamp-1">{activity.name}</h3>
                )}
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 fill-accent text-accent" />
                  <span className="text-sm font-medium">{activity.rating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({activity.totalRatings})</span>
                </div>
              </div>
      <Button 
        onClick={() => {
          trackActivity({
            action_type: 'swap_activity',
            activity_id: activity.id,
            activity_name: activity.name,
            activity_category: activity.category
          });
          // Track skip for learning system
          if (onSkipActivity) {
            onSkipActivity(activity);
          }
          onSwapActivity();
        }} 
        variant="ghost" 
        size="sm" 
        disabled={loading || !canSwapActivity}
      >
        Swap
      </Button>
            </div>
            
            <div 
              className="flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
              onClick={() => handleNavigate(activity.lat, activity.lng)}
            >
              <MapPin className="w-4 h-4" />
              <span className="line-clamp-1">{activity.address}</span>
            </div>

            <PhotoGallery photos={activityPhotos} placeName={activity.name} />

            <div className="flex gap-2">
              {activityPhone ? (
                <a
                  href={`tel:${activityPhone}`}
                  onClick={(e) => {
                    e.preventDefault();
                    trackActivity({
                      action_type: 'call',
                      activity_id: activity.id,
                      activity_name: activity.name
                    });
                    window.location.href = `tel:${activityPhone}`;
                  }}
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  <span>Call</span>
                </a>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    trackActivity({
                      action_type: 'view_details',
                      activity_id: activity.id,
                      activity_name: activity.name
                    });
                    fetchPlaceDetails(activity.id, 'activity', activity.source);
                  }}
                  disabled={loadingActivityPhone}
                  className="gap-2"
                >
                  {loadingActivityPhone ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Phone className="h-4 w-4" />
                  )}
                  Get Details
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {activity.category === 'event' ? 'Get Tickets' : 'Visit'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {(() => {
                    const links = getActivityLinks(
                      {
                        name: activity.name,
                        city: activity.city,
                        lat: activity.lat,
                        lng: activity.lng,
                        address: activity.address,
                        category: activity.category,
                      },
                      userPreferences
                    );
                    return (
                      <>
                        <DropdownMenuItem asChild>
                          <a 
                            href={links.googleMaps} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="cursor-pointer"
                            onClick={() => trackActivity({
                              action_type: 'reserve',
                              activity_id: activity.id,
                              activity_name: activity.name
                            })}
                          >
                            Google Maps
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <a 
                            href={links.yelp} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="cursor-pointer"
                            onClick={() => trackActivity({
                              action_type: 'reserve',
                              activity_id: activity.id,
                              activity_name: activity.name
                            })}
                          >
                            Yelp
                          </a>
                        </DropdownMenuItem>
                        {activity.category === 'event' && links.eventbrite && (
                          <DropdownMenuItem asChild>
                            <a 
                              href={links.eventbrite} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="cursor-pointer"
                              onClick={() => trackActivity({
                                action_type: 'reserve',
                                activity_id: activity.id,
                                activity_name: activity.name
                              })}
                            >
                              Eventbrite
                            </a>
                          </DropdownMenuItem>
                        )}
                        {activity.category === 'event' && links.ticketmaster && (
                          <DropdownMenuItem asChild>
                            <a 
                              href={links.ticketmaster} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="cursor-pointer"
                              onClick={() => trackActivity({
                                action_type: 'reserve',
                                activity_id: activity.id,
                                activity_name: activity.name
                              })}
                            >
                              Ticketmaster
                            </a>
                          </DropdownMenuItem>
                        )}
                        {activity.category === 'event' && links.fever && (
                          <DropdownMenuItem asChild>
                            <a 
                              href={links.fever} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="cursor-pointer"
                              onClick={() => trackActivity({
                                action_type: 'reserve',
                                activity_id: activity.id,
                                activity_name: activity.name
                              })}
                            >
                              Fever
                            </a>
                          </DropdownMenuItem>
                        )}
                      </>
                    );
                  })()}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
