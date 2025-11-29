import { useState } from "react";
import { MapPin, Phone, Globe, Clock, Star, ExternalLink, Loader2, Navigation } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { PhotoGallery } from "@/components/PhotoGallery";

interface RestaurantDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  placeId: string;
  initialName: string;
}

interface PlaceDetails {
  name: string;
  address: string;
  phoneNumber: string | null;
  website: string | null;
  googleMapsUrl: string | null;
  rating: number;
  totalRatings: number;
  priceLevel: string;
  hours: string[];
  isOpen: boolean | null;
  lat: number;
  lng: number;
  photos: Array<{ url: string; width: number; height: number }>;
}

export const RestaurantDetailsDrawer = ({
  isOpen,
  onClose,
  placeId,
  initialName,
}: RestaurantDetailsDrawerProps) => {
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = async () => {
    if (details) {
      console.log('✅ Details already loaded, skipping fetch');
      return;
    }
    
    console.log('🔄 Fetching details for place:', placeId);
    setLoading(true);
    setError(null);
    try {
      const response = await supabase.functions.invoke('place-details', {
        body: { placeId }
      });

      console.log('📦 Place details response:', { 
        hasData: !!response?.data, 
        hasError: !!response?.error,
        photosCount: response?.data?.photos?.length || 0,
        dataKeys: response?.data ? Object.keys(response.data) : []
      });

      if (response?.error) {
        console.error('❌ Error from place-details function:', response.error);
        throw response.error;
      }
      
      const data = response?.data;
      if (!data) {
        throw new Error('No data returned from place-details');
      }
      
      console.log('✅ Setting details state. Photos:', data.photos?.length || 0);
      console.log('📸 Photo URLs:', data.photos?.map((p: any) => p.url));
      setDetails(data);
      console.log('✅ Details state set successfully');
    } catch (error) {
      console.error('💥 Error fetching place details:', error);
      setError(error instanceof Error ? error.message : 'Failed to load details');
      toast({
        title: "Error",
        description: "Failed to load restaurant details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      console.log('✅ Fetch complete. Loading set to false');
    }
  };

  const handleOpenChange = (open: boolean) => {
    console.log('🔄 Drawer open state changed:', open);
    if (open) {
      console.log('🚪 Opening drawer, fetching details...');
      fetchDetails();
    } else {
      console.log('🚪 Closing drawer, resetting state...');
      // Reset state when closing
      setDetails(null);
      setLoading(false);
      setError(null);
      onClose();
    }
  };

  const handleNavigate = () => {
    if (details?.googleMapsUrl) {
      window.open(details.googleMapsUrl, '_blank');
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-2xl">{initialName}</DrawerTitle>
        </DrawerHeader>
        
        <div className="px-4 pb-8 space-y-6 max-h-[70vh] overflow-y-auto min-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Loading details...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-destructive font-medium">Failed to load details</p>
              <p className="text-sm text-muted-foreground mt-2">{error}</p>
            </div>
          ) : details ? (
            <>
              {/* Rating and Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 fill-accent text-accent" />
                  <span className="text-lg font-semibold">{details.rating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">({details.totalRatings} reviews)</span>
                  {details.priceLevel && (
                    <span className="text-lg font-medium ml-2">{details.priceLevel}</span>
                  )}
                </div>
                {details.isOpen !== null && (
                  <Badge variant={details.isOpen ? "default" : "secondary"}>
                    {details.isOpen ? "Open Now" : "Closed"}
                  </Badge>
                )}
              </div>

              {/* Navigate Button */}
              <Button onClick={handleNavigate} className="w-full" size="lg">
                <Navigation className="w-4 h-4 mr-2" />
                Get Directions
              </Button>

              {/* Photos Gallery */}
              {details.photos && details.photos.length > 0 ? (
                <div className="space-y-2">
                  <p className="font-medium">Photos ({details.photos.length})</p>
                  <PhotoGallery photos={details.photos} placeName={details.name} />
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No photos available</div>
              )}

              {/* Address */}
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Address</p>
                  <p className="text-sm text-muted-foreground">{details.address}</p>
                </div>
              </div>

              {/* Phone */}
              {details.phoneNumber && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <a 
                      href={`tel:${details.phoneNumber}`}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      {details.phoneNumber}
                    </a>
                  </div>
                </div>
              )}

              {/* Website */}
              {details.website && (
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Website</p>
                    <a 
                      href={details.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Visit website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Hours */}
              {details.hours.length > 0 && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium mb-2">Hours</p>
                    <div className="space-y-1">
                      {details.hours.map((hour, idx) => (
                        <p key={idx} className="text-sm text-muted-foreground">
                          {hour}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No details available</p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
