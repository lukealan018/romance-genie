import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RestaurantCard } from "@/components/RestaurantCard";
import { ActivityCard } from "@/components/ActivityCard";
import CustomButton from "@/components/CustomButton";
import { toast } from "@/hooks/use-toast";

interface ResultsListProps {
  loading: boolean;
  searchType: "restaurants" | "activities";
  onSearchTypeChange: (type: "restaurants" | "activities") => void;
  restaurants: any[];
  activities: any[];
  radius: number;
  cuisine: string;
  onReroll: () => void;
  onSelectPlace: (place: { id: string; name: string }) => void;
  onWidenRadius: () => void;
  onSwitchCuisine: () => void;
}

export const ResultsList = ({
  loading,
  searchType,
  onSearchTypeChange,
  restaurants,
  activities,
  radius,
  cuisine,
  onReroll,
  onSelectPlace,
  onWidenRadius,
  onSwitchCuisine,
}: ResultsListProps) => {
  if (!loading && restaurants.length === 0 && activities.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">More options</h2>
        <Button onClick={onReroll} variant="outline" size="sm" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </div>

      <Tabs value={searchType} onValueChange={(v) => onSearchTypeChange(v as "restaurants" | "activities")} className="mb-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="restaurants">Restaurants ({restaurants.length})</TabsTrigger>
          <TabsTrigger value="activities">Activities ({activities.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading && (
        <div className="muted text-center py-8">Finding great spots…</div>
      )}

      {!loading && searchType === "restaurants" && restaurants.length === 0 && (
        <div className="muted text-center py-8">
          <div>No matches nearby. Try widening your radius or switching cuisines.</div>
          <div style={{marginTop:'12px', display:'flex', gap:'8px', justifyContent:'center'}}>
            <CustomButton 
              variant="secondary" 
              size="sm" 
              onClick={onWidenRadius}
            >
              Widen radius +5
            </CustomButton>
            <CustomButton 
              variant="quiet" 
              size="sm" 
              onClick={onSwitchCuisine}
            >
              Switch cuisine
            </CustomButton>
          </div>
        </div>
      )}

      {!loading && searchType === "activities" && activities.length === 0 && (
        <div className="muted text-center py-8">
          <div>No matches nearby. Try widening your radius or switching activities.</div>
          <div style={{marginTop:'12px', display:'flex', gap:'8px', justifyContent:'center'}}>
            <CustomButton 
              variant="secondary" 
              size="sm" 
              onClick={onWidenRadius}
            >
              Widen radius +5
            </CustomButton>
          </div>
        </div>
      )}

      {!loading && searchType === "restaurants" && restaurants.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {restaurants.map((item, idx) => (
            <RestaurantCard 
              key={idx} 
              {...item}
              priceLevel={item.priceLevel || ""}
              onClick={() => onSelectPlace({ id: item.id, name: item.name })}
            />
          ))}
        </div>
      )}

      {!loading && searchType === "activities" && activities.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {activities.map((item, idx) => (
            <ActivityCard 
              key={idx} 
              {...item}
              onClick={() => onSelectPlace({ id: item.id, name: item.name })}
            />
          ))}
        </div>
      )}
    </div>
  );
};
