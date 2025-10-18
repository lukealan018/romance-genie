import { Star, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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
  const handleAddressClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
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
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-accent text-accent" />
            <span className="font-medium">{rating.toFixed(1)}</span>
            {totalRatings > 0 && (
              <span className="text-xs text-muted-foreground">({totalRatings})</span>
            )}
          </div>
          {priceLevel && (
            <span className="font-medium text-sm">{priceLevel}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
