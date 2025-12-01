import { useState } from "react";
import { Star, MapPin, Phone, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getReservationLinks, getMapUrl } from "@/lib/external-links";

interface RestaurantCardProps {
  id: string;
  name: string;
  rating: number;
  address: string;
  priceLevel: string;
  totalRatings?: number;
  lat: number;
  lng: number;
  city?: string;
  source?: string;
  isHiddenGem?: boolean;
  isNewDiscovery?: boolean;
  isLocalFavorite?: boolean;
  onClick?: () => void;
}

export const RestaurantCard = ({
  id,
  name,
  rating,
  address,
  priceLevel,
  totalRatings = 0,
  lat,
  lng,
  city,
  source,
  isHiddenGem = false,
  isNewDiscovery = false,
  isLocalFavorite = false,
  onClick,
}: RestaurantCardProps) => {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loadingPhone, setLoadingPhone] = useState(false);

  const handleAddressClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getMapUrl(name, address, lat, lng);
    window.open(url, '_blank');
  };

  const handlePhoneClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    console.log('Fetching phone number for place:', id);
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
          description: "This restaurant doesn't have a phone number listed",
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
      <div className="h-48 bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden flex items-center justify-center -mx-[var(--space-3)] -mt-[var(--space-3)] mb-[var(--space-3)]">
        <div className="text-5xl font-bold text-primary/40">
          {name.charAt(0)}
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-lg line-clamp-1 flex-1">{name}</h3>
          <div className="flex flex-wrap gap-1 justify-end">
            {source && (
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
        
        <div 
          className="flex items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
          onClick={handleAddressClick}
        >
          <MapPin className="w-4 h-4" />
          <span className="line-clamp-1">{address}</span>
        </div>
        
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-accent text-accent" />
            <span className="font-medium">{rating.toFixed(1)}</span>
            {totalRatings > 0 && (
              <span className="text-xs text-muted-foreground">({totalRatings})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {priceLevel && (
              <span className="font-medium text-sm">{priceLevel}</span>
            )}
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button size="icon" variant="outline" className="h-8 w-8">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {(() => {
                  const links = getReservationLinks(
                    {
                      name,
                      city,
                      lat,
                      lng,
                      address,
                    },
                    undefined
                  );
                  return (
                    <>
                      <DropdownMenuItem asChild>
                        <a href={links.openTable} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                          OpenTable
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={links.resy} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                          Resy
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={links.yelp} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                          Yelp
                        </a>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <a href={links.googleMaps} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
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
      </div>
    </div>
  );
};