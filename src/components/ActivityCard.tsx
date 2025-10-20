import { useState } from "react";
import { Star, MapPin, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ActivityCardProps {
  id: string;
  name: string;
  rating: number;
  address: string;
  totalRatings?: number;
  lat: number;
  lng: number;
  onClick?: () => void;
}

export const ActivityCard = ({
  id,
  name,
  rating,
  address,
  totalRatings = 0,
  lat,
  lng,
  onClick,
}: ActivityCardProps) => {
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [loadingPhone, setLoadingPhone] = useState(false);

  const handleAddressClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  const handlePhoneClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    console.log('Fetching phone number for activity:', id);
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
      <div className="h-48 bg-gradient-to-br from-accent/20 to-primary/20 relative overflow-hidden flex items-center justify-center -mx-[var(--space-3)] -mt-[var(--space-3)] mb-[var(--space-3)]">
        <div className="text-5xl font-bold text-accent/40">
          {name.charAt(0)}
        </div>
      </div>
      <div className="space-y-3">
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
      </div>
    </div>
  );
};
