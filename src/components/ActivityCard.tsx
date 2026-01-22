import { useState } from "react";
import { Star, MapPin, Phone, Loader2, ExternalLink, Calendar, Ticket, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getActivityLinks, getMapUrl } from "@/lib/external-links";
import { format, parseISO } from "date-fns";

interface ActivityCardProps {
  id: string;
  name: string;
  rating: number;
  address: string;
  totalRatings?: number;
  lat: number;
  lng: number;
  city?: string;
  category?: 'event' | 'activity';
  source?: string;
  isHiddenGem?: boolean;
  isNewDiscovery?: boolean;
  isLocalFavorite?: boolean;
  isPersonalMatch?: boolean;
  onClick?: () => void;
  // Ticketmaster-specific props
  ticketUrl?: string;
  eventDate?: string;
  eventTime?: string;
  priceMin?: number;
  priceMax?: number;
  imageUrl?: string;
  venueName?: string;
}

// Format event date for display
const formatEventDate = (dateStr?: string, timeStr?: string): string | null => {
  if (!dateStr) return null;
  try {
    const date = parseISO(dateStr);
    let formatted = format(date, "EEE, MMM d");
    if (timeStr) {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      formatted += ` · ${hour12}:${minutes} ${ampm}`;
    }
    return formatted;
  } catch {
    return dateStr;
  }
};

// Format price range for display
const formatPriceRange = (min?: number, max?: number): string | null => {
  if (!min && !max) return null;
  if (min && max && min === max) return `$${min.toFixed(0)}`;
  if (min && max) return `$${min.toFixed(0)} - $${max.toFixed(0)}`;
  if (min) return `From $${min.toFixed(0)}`;
  if (max) return `Up to $${max.toFixed(0)}`;
  return null;
};

export const ActivityCard = ({
  id,
  name,
  rating,
  address,
  totalRatings = 0,
  lat,
  lng,
  city,
  category = 'activity',
  source,
  isHiddenGem = false,
  isNewDiscovery = false,
  isLocalFavorite = false,
  isPersonalMatch = false,
  onClick,
  ticketUrl,
  eventDate,
  eventTime,
  priceMin,
  priceMax,
  imageUrl,
  venueName,
}: ActivityCardProps) => {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loadingPhone, setLoadingPhone] = useState(false);

  const isTicketmasterEvent = source === 'ticketmaster' || id.startsWith('tm_');
  const formattedDate = formatEventDate(eventDate, eventTime);
  const formattedPrice = formatPriceRange(priceMin, priceMax);

  const handleAddressClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getMapUrl(name, address, lat, lng);
    window.open(url, '_blank');
  };

  const handleGetTickets = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (ticketUrl) {
      window.open(ticketUrl, '_blank');
    }
  };

  const handlePhoneClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    console.log('Fetching phone number for activity:', id);
    setLoadingPhone(true);
    try {
      const response = await supabase.functions.invoke('place-details', {
        body: { placeId: id, source }
      });

      console.log('Phone fetch response:', response);

      if (response?.error) {
        console.error('Error from place-details:', response.error);
        throw response.error;
      }
      
      const data = response?.data;
      if (data?.phoneNumber) {
        console.log('Phone number received:', data.phoneNumber);
        setPhoneNumber(data.phoneNumber);
      } else {
        console.log('No phone number in response');
        toast({
          title: "No phone number",
          description: "This venue doesn't have a phone number listed",
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
      setLoadingPhone(false);
    }
  };

  return (
    <div 
      className="card fade-slide-in hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      {/* Hero image area - show event poster for Ticketmaster, fallback for others */}
      <div className="h-48 bg-gradient-to-br from-accent/20 to-primary/20 relative overflow-hidden flex items-center justify-center -mx-[var(--space-3)] -mt-[var(--space-3)] mb-[var(--space-3)]">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <div className={`text-5xl font-bold text-accent/40 ${imageUrl ? 'hidden' : ''}`}>
          {name.charAt(0)}
        </div>
        {/* Live Event badge for Ticketmaster */}
        {isTicketmasterEvent && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium bg-red-500/90 text-white flex items-center gap-1">
            <Ticket className="w-3 h-3" />
            Live Event
          </div>
        )}
      </div>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg line-clamp-1 flex-1">{name}</h3>
          <div className="flex flex-wrap gap-1 justify-end">
            {isPersonalMatch && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                💫 For You
              </span>
            )}
            {source && !isPersonalMatch && !isTicketmasterEvent && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-500/20 text-slate-300 border border-slate-500/30">
                {source === 'foursquare' ? '🟦 Foursquare' : '🌐 Google'}
              </span>
            )}
            {isHiddenGem && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30">
                💎 Hidden Gem
              </span>
            )}
            {isNewDiscovery && !isHiddenGem && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                🆕 New
              </span>
            )}
            {isLocalFavorite && !isHiddenGem && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                🏆 Local Fav
              </span>
            )}
          </div>
        </div>

        {/* Show venue name for Ticketmaster events */}
        {isTicketmasterEvent && venueName && (
          <p className="text-sm text-muted-foreground line-clamp-1">at {venueName}</p>
        )}

        {/* Event date and price for Ticketmaster */}
        {isTicketmasterEvent && (formattedDate || formattedPrice) && (
          <div className="flex items-center gap-3 text-sm">
            {formattedDate && (
              <span className="flex items-center gap-1 text-accent">
                <Calendar className="w-4 h-4" />
                {formattedDate}
              </span>
            )}
            {formattedPrice && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                {formattedPrice}
              </span>
            )}
          </div>
        )}
        
        <div 
          className="flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
          onClick={handleAddressClick}
        >
          <MapPin className="w-4 h-4" />
          <span className="line-clamp-1">{address}</span>
        </div>
        
        <div className="flex items-center justify-between gap-2">
          {/* Rating - hide for Ticketmaster since they don't have ratings */}
          {!isTicketmasterEvent ? (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-accent text-accent" />
              <span className="font-medium">{rating.toFixed(1)}</span>
              {totalRatings > 0 && (
                <span className="text-xs text-muted-foreground">({totalRatings})</span>
              )}
            </div>
          ) : (
            <div /> // Spacer
          )}

          <div className="flex items-center gap-2">
            {/* Get Tickets button for Ticketmaster events */}
            {isTicketmasterEvent && ticketUrl ? (
              <Button
                size="sm"
                onClick={handleGetTickets}
                className="gap-1"
              >
                <Ticket className="h-4 w-4" />
                Get Tickets
              </Button>
            ) : (
              <>
                {phoneNumber ? (
                  <a
                    href={`tel:${phoneNumber}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      console.log('Clicking call button with number:', phoneNumber);
                      window.location.href = `tel:${phoneNumber}`;
                    }}
                    className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium transition-colors"
                  >
                    <Phone className="h-4 w-4" />
                    <span>Call</span>
                  </a>
                ) : (
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={handlePhoneClick}
                    disabled={loadingPhone}
                  >
                    {loadingPhone ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Phone className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button size="icon" variant="outline" className="h-8 w-8">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {(() => {
                  const links = getActivityLinks(
                    {
                      name,
                      city,
                      lat,
                      lng,
                      address,
                      category,
                    },
                    undefined
                  );
                  return (
                    <>
                      <DropdownMenuItem asChild>
                        <a href={links.googleMaps} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                          Google Maps
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={links.yelp} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                          Yelp
                        </a>
                      </DropdownMenuItem>
                      {category === 'event' && links.eventbrite && (
                        <DropdownMenuItem asChild>
                          <a href={links.eventbrite} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                            Eventbrite
                          </a>
                        </DropdownMenuItem>
                      )}
                      {category === 'event' && links.ticketmaster && (
                        <DropdownMenuItem asChild>
                          <a href={links.ticketmaster} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                            Ticketmaster
                          </a>
                        </DropdownMenuItem>
                      )}
                      {category === 'event' && links.fever && (
                        <DropdownMenuItem asChild>
                          <a href={links.fever} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
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
      </div>
    </div>
  );
};