import { Star, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface RestaurantCardProps {
  name: string;
  cuisine: string;
  rating: number;
  distance: number;
  priceLevel: string;
  imageUrl?: string;
}

export const RestaurantCard = ({
  name,
  cuisine,
  rating,
  distance,
  priceLevel,
  imageUrl,
}: RestaurantCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
      <div className="h-48 bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-primary/30">
            {name.charAt(0)}
          </div>
        )}
      </div>
      <CardContent className="p-4 space-y-2">
        <h3 className="font-semibold text-lg line-clamp-1">{name}</h3>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{cuisine}</span>
          <span className="font-medium">{priceLevel}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-accent text-accent" />
            <span className="font-medium">{rating.toFixed(1)}</span>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{distance.toFixed(1)} mi</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
