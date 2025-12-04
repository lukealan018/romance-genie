import { Loader2 } from "lucide-react";
import { CuisinePicker } from "@/components/CuisinePicker";
import { PriceLevelPicker } from "@/components/PriceLevelPicker";
import { ActivityPicker } from "@/components/ActivityPicker";
import { LocationToggle } from "@/components/LocationToggle";
import { RadiusSelector } from "@/components/RadiusSelector";
import CustomButton from "@/components/CustomButton";
import { SearchMode } from "@/components/ModeSelection";

interface ManualFiltersProps {
  searchMode: SearchMode | null;
  cuisine: string;
  activityCategory: string;
  priceLevel: string;
  locationMode: "gps" | "zip";
  zipCode: string;
  radius: number;
  lat: number | null;
  lng: number | null;
  loading: boolean;
  gettingLocation: boolean;
  onCuisineChange: (value: string) => void;
  onActivityChange: (value: string) => void;
  onPriceLevelChange: (value: string) => void;
  onLocationModeChange: (mode: "gps" | "zip") => void;
  onZipCodeChange: (value: string) => void;
  onRadiusChange: (value: number) => void;
  onUseCurrentLocation: () => void;
  onSeePlan: () => void;
}

export const ManualFilters = ({
  searchMode,
  cuisine,
  activityCategory,
  priceLevel,
  locationMode,
  zipCode,
  radius,
  lat,
  lng,
  loading,
  gettingLocation,
  onCuisineChange,
  onActivityChange,
  onPriceLevelChange,
  onLocationModeChange,
  onZipCodeChange,
  onRadiusChange,
  onUseCurrentLocation,
  onSeePlan,
}: ManualFiltersProps) => {
  return (
    <div className="space-y-6 mt-6">
      {(searchMode === 'both' || searchMode === 'restaurant_only') && (
        <>
          <PriceLevelPicker
            selected={priceLevel}
            onSelect={onPriceLevelChange}
          />
          <CuisinePicker
            selected={cuisine}
            onSelect={onCuisineChange}
          />
        </>
      )}

      {(searchMode === 'both' || searchMode === 'activity_only') && (
        <ActivityPicker
          selected={activityCategory}
          onSelect={onActivityChange}
        />
      )}

      <div className="bg-card rounded-xl border p-6 space-y-6">
        <LocationToggle
          mode={locationMode}
          zipCode={zipCode}
          onModeChange={onLocationModeChange}
          onZipCodeChange={onZipCodeChange}
          onUseCurrentLocation={onUseCurrentLocation}
          locationDetected={lat !== null && lng !== null}
          gettingLocation={gettingLocation}
        />
        <div className="h-px bg-border" />
        <RadiusSelector 
          value={radius} 
          onChange={onRadiusChange} 
        />
      </div>

      <CustomButton full onClick={onSeePlan} disabled={loading} size="lg">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Finding Spots...
          </>
        ) : searchMode === 'restaurant_only' ? (
          "Find Dinner Spot"
        ) : searchMode === 'activity_only' ? (
          "Find Activity"
        ) : (
          "See Tonight's Plan"
        )}
      </CustomButton>
    </div>
  );
};
