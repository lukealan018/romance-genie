import { useState } from "react";
import { Star, MapPin, Phone, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RestaurantCardProps {
  id: string;
  name: string;
  rating: number;
  address: string;
  priceLevel: string;
  totalRatings?: number;
  lat: number;
  lng: number;
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
  onClick,
}: RestaurantCardProps) => {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loadingPhone, setLoadingPhone] = useState(false);

  const handleAddressClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const handlePhoneClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    console.log('Fetching phone number for place:', id);
    setLoadingPhone(true);
    try {
      const { data, error } = await supabase.functions.invoke('place-details', {
        body: { placeId: id }
      });

      console.log('Phone fetch response:', { data, error });

      if (error) {
        console.error('Error from place-details:', error);
        throw error;
      }
      
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
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02] cursor-pointer"
      onClick={onClick}
    >
      <div className="h-48 bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden flex items-center justify-center">
        <div className="text-5xl font-bold text-primary/40">
          {name.charAt(0)}
        </div>
      </div>
      <CardContent className="p-4 space-y-3">
        <h3 className="font-semibold text-lg line-clamp-1">{name}</h3>
        
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
