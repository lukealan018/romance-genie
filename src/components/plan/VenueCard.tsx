import { useState, useEffect } from "react";
import { MapPin, Star, Phone, Loader2, ExternalLink, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getReservationLinks, getActivityLinks, getMapUrl } from "@/lib/external-links";
import { PhotoGallery } from "@/components/PhotoGallery";
import { trackActivity } from "@/lib/activity-tracker";
import { VenueBadges } from "./VenueBadges";
import { getConciergeRatingLabel, getVenueTagline } from "./plan-utils";
import type { Place, UserReservationPrefs } from "./types";

interface VenueCardProps {
  place: Place;
  type: 'restaurant' | 'activity';
  distance: number;
  onSwap: () => void;
  onSkip?: (place: Place) => void;
  loading?: boolean;
  canSwap?: boolean;
  userPreferences: UserReservationPrefs;
}

export const VenueCard = ({
  place,
  type,
  distance,
  onSwap,
  onSkip,
  loading = false,
  canSwap = true,
  userPreferences,
}: VenueCardProps) => {
  const [phone, setPhone] = useState<string | null>(null);
  const [website, setWebsite] = useState<string | null>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const isEvent = type === 'activity' && (place.source === 'ticketmaster' || place.id.startsWith('tm_'));
  const label = type === 'restaurant' ? 'Dinner' : 'Activity';

  const fetchPlaceDetails = async () => {
    setLoadingDetails(true);
    try {
      const response = await supabase.functions.invoke('place-details', {
        body: { placeId: place.id, source: place.source }
      });
      if (response?.error) throw response.error;
      const data = response?.data;
      if (data) {
        setPhone(data.phoneNumber || null);
        setWebsite(data.website || null);
        setPhotos(data.photos || []);
      }
    } catch (error) {
      console.error(`Error fetching ${type} details:`, error);
      toast({ title: "Error", description: `Failed to fetch ${type} details`, variant: "destructive" });
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    setWebsite(null);
    setPhotos([]);
    if (place.id) {
      fetchPlaceDetails();
    }
  }, [place.id]);

  const handleNavigate = () => {
    const url = getMapUrl(place.name, place.address, place.lat, place.lng);
    window.open(url, '_blank');
  };

  const handleSwap = () => {
    trackActivity({
      action_type: type === 'restaurant' ? 'swap_restaurant' : 'swap_activity',
      ...(type === 'restaurant' 
        ? { restaurant_id: place.id, restaurant_name: place.name, restaurant_cuisine: place.cuisine, restaurant_price_level: place.priceLevel }
        : { activity_id: place.id, activity_name: place.name, activity_category: place.category }
      ),
    });
    if (onSkip) onSkip(place);
    onSwap();
  };

  return (
    <div className="bg-background rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase">{label}</span>
            <span className="text-xs text-muted-foreground">• {distance.toFixed(1)} mi away</span>
          </div>
          {website ? (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-lg line-clamp-1 hover:text-primary transition-colors inline-flex items-center gap-1 group"
            >
              {place.name}
              <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ) : (
            <h3 className="font-semibold text-lg line-clamp-1">{place.name}</h3>
          )}
          <p className="text-sm italic text-muted-foreground/80 mt-0.5">{getVenueTagline(place, type)}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-accent text-accent" />
              <span className="text-sm font-medium">{getConciergeRatingLabel(place.rating, place.totalRatings)}</span>
            </div>
            {type === 'restaurant' && place.priceLevel && (
              <span className="text-sm font-medium">{place.priceLevel}</span>
            )}
          </div>
          <VenueBadges
            isHiddenGem={place.isHiddenGem}
            isNewDiscovery={place.isNewDiscovery}
            isLocalFavorite={place.isLocalFavorite}
            isLiveEvent={isEvent}
          />
        </div>
        <Button onClick={handleSwap} variant="ghost" size="sm" disabled={loading || !canSwap}>
          Something Else
        </Button>
      </div>

      <div
        className="flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
        onClick={handleNavigate}
      >
        <MapPin className="w-4 h-4" />
        <span className="line-clamp-1">{place.address}</span>
      </div>

      <PhotoGallery photos={photos} placeName={place.name} />

      <div className="flex gap-2">
        {phone ? (
          <a
            href={`tel:${phone}`}
            onClick={(e) => {
              e.preventDefault();
              trackActivity({
                action_type: 'call',
                ...(type === 'restaurant'
                  ? { restaurant_id: place.id, restaurant_name: place.name }
                  : { activity_id: place.id, activity_name: place.name }
                ),
              });
              window.location.href = `tel:${phone}`;
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
                ...(type === 'restaurant'
                  ? { restaurant_id: place.id, restaurant_name: place.name }
                  : { activity_id: place.id, activity_name: place.name }
                ),
              });
              fetchPlaceDetails();
            }}
            disabled={loadingDetails}
            className="gap-2"
          >
            {loadingDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
            Get Details
          </Button>
        )}

        {type === 'activity' && isEvent && place.ticketUrl ? (
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              trackActivity({ action_type: 'reserve', activity_id: place.id, activity_name: place.name });
              window.open(place.ticketUrl, '_blank');
            }}
            className="gap-2"
          >
            <Ticket className="w-4 h-4" />
            Get Tickets
          </Button>
        ) : type === 'restaurant' ? (
          <ReservationDropdown place={place} userPreferences={userPreferences} />
        ) : (
          <ActivityLinksDropdown place={place} userPreferences={userPreferences} />
        )}
      </div>
    </div>
  );
};

// Sub-components for link dropdowns
function ReservationDropdown({ place, userPreferences }: { place: Place; userPreferences: UserReservationPrefs }) {
  const links = getReservationLinks(
    { name: place.name, city: place.city, lat: place.lat, lng: place.lng, address: place.address },
    userPreferences
  );
  const trackReserve = () => trackActivity({ action_type: 'reserve', restaurant_id: place.id, restaurant_name: place.name });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ExternalLink className="w-4 h-4 mr-2" />
          Reserve
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {[
          { label: 'OpenTable', url: links.openTable },
          { label: 'Resy', url: links.resy },
          { label: 'Yelp', url: links.yelp },
          { label: 'Google Maps', url: links.googleMaps },
        ].map(link => (
          <DropdownMenuItem key={link.label} asChild>
            <a href={link.url} target="_blank" rel="noopener noreferrer" className="cursor-pointer" onClick={trackReserve}>
              {link.label}
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ActivityLinksDropdown({ place, userPreferences }: { place: Place; userPreferences: UserReservationPrefs }) {
  const links = getActivityLinks(
    { name: place.name, city: place.city, lat: place.lat, lng: place.lng, address: place.address, category: place.category },
    userPreferences
  );
  const trackReserve = () => trackActivity({ action_type: 'reserve', activity_id: place.id, activity_name: place.name });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <ExternalLink className="w-4 h-4 mr-2" />
          {place.category === 'event' ? 'Get Tickets' : 'Visit'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <a href={links.googleMaps} target="_blank" rel="noopener noreferrer" className="cursor-pointer" onClick={trackReserve}>Google Maps</a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.yelp} target="_blank" rel="noopener noreferrer" className="cursor-pointer" onClick={trackReserve}>Yelp</a>
        </DropdownMenuItem>
        {place.category === 'event' && links.eventbrite && (
          <DropdownMenuItem asChild>
            <a href={links.eventbrite} target="_blank" rel="noopener noreferrer" className="cursor-pointer" onClick={trackReserve}>Eventbrite</a>
          </DropdownMenuItem>
        )}
        {place.category === 'event' && links.ticketmaster && (
          <DropdownMenuItem asChild>
            <a href={links.ticketmaster} target="_blank" rel="noopener noreferrer" className="cursor-pointer" onClick={trackReserve}>Ticketmaster</a>
          </DropdownMenuItem>
        )}
        {place.category === 'event' && links.fever && (
          <DropdownMenuItem asChild>
            <a href={links.fever} target="_blank" rel="noopener noreferrer" className="cursor-pointer" onClick={trackReserve}>Fever</a>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
