import { RefreshCw, ArrowRight, MapPin, Star, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Place {
  id: string;
  name: string;
  rating: number;
  totalRatings: number;
  address: string;
  lat: number;
  lng: number;
  priceLevel?: string;
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
  loading?: boolean;
  canSwapRestaurant?: boolean;
  canSwapActivity?: boolean;
}

export const PlanCard = ({
  restaurant,
  activity,
  distances,
  onSwapRestaurant,
  onSwapActivity,
  onReroll,
  loading = false,
  canSwapRestaurant = true,
  canSwapActivity = true,
}: PlanCardProps) => {
  const [restaurantPhone, setRestaurantPhone] = useState<string | null>(null);
  const [activityPhone, setActivityPhone] = useState<string | null>(null);
  const [loadingRestaurantPhone, setLoadingRestaurantPhone] = useState(false);
  const [loadingActivityPhone, setLoadingActivityPhone] = useState(false);

  const fetchPhone = async (placeId: string, type: 'restaurant' | 'activity') => {
    const setPhone = type === 'restaurant' ? setRestaurantPhone : setActivityPhone;
    const setLoading = type === 'restaurant' ? setLoadingRestaurantPhone : setLoadingActivityPhone;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('place-details', {
        body: { placeId }
      });

      if (error) throw error;
      
      if (data?.phoneNumber) {
        setPhone(data.phoneNumber);
      } else {
        toast({
          title: "No phone number",
          description: `This ${type} doesn't have a phone number listed`,
        });
      }
    } catch (error) {
      console.error('Error fetching phone number:', error);
      toast({
        title: "Error",
        description: "Failed to get phone number",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  if (!restaurant && !activity) {
    return null;
  }

  return (
    <Card className="mb-8 border-2 border-primary/20 shadow-lg bg-gradient-to-br from-card to-card/50">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Tonight's Plan
          </CardTitle>
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
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Restaurant Section */}
        {restaurant && (
          <div className="bg-background rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Dinner</span>
                  <span className="text-xs text-muted-foreground">• {distances.toRestaurant.toFixed(1)} mi away</span>
                </div>
                <h3 className="font-semibold text-lg line-clamp-1">{restaurant.name}</h3>
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
              <Button onClick={onSwapRestaurant} variant="ghost" size="sm" disabled={loading || !canSwapRestaurant}>
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

            {restaurantPhone ? (
              <a
                href={`tel:${restaurantPhone}`}
                onClick={(e) => {
                  e.preventDefault();
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
                onClick={() => fetchPhone(restaurant.id, 'restaurant')}
                disabled={loadingRestaurantPhone}
                className="gap-2"
              >
                {loadingRestaurantPhone ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
                Get Phone
              </Button>
            )}
          </div>
        )}

        {/* Connection Arrow */}
        {restaurant && activity && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <ArrowRight className="w-5 h-5" />
            <span className="text-sm">{distances.betweenPlaces.toFixed(1)} mi between venues</span>
          </div>
        )}

        {/* Activity Section */}
        {activity && (
          <div className="bg-background rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase">Activity</span>
                  <span className="text-xs text-muted-foreground">• {distances.toActivity.toFixed(1)} mi away</span>
                </div>
                <h3 className="font-semibold text-lg line-clamp-1">{activity.name}</h3>
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-4 h-4 fill-accent text-accent" />
                  <span className="text-sm font-medium">{activity.rating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({activity.totalRatings})</span>
                </div>
              </div>
              <Button onClick={onSwapActivity} variant="ghost" size="sm" disabled={loading || !canSwapActivity}>
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

            {activityPhone ? (
              <a
                href={`tel:${activityPhone}`}
                onClick={(e) => {
                  e.preventDefault();
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
                onClick={() => fetchPhone(activity.id, 'activity')}
                disabled={loadingActivityPhone}
                className="gap-2"
              >
                {loadingActivityPhone ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
                Get Phone
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
