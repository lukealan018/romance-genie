import { MapPin, Hash, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LocationToggleProps {
  mode: "gps" | "zip";
  zipCode: string;
  onModeChange: (mode: "gps" | "zip") => void;
  onZipCodeChange: (zip: string) => void;
  onUseCurrentLocation: () => void;
  locationDetected?: boolean;
  gettingLocation?: boolean;
}

export const LocationToggle = ({
  mode,
  zipCode,
  onModeChange,
  onZipCodeChange,
  onUseCurrentLocation,
  locationDetected = false,
  gettingLocation = false,
}: LocationToggleProps) => {
  return (
    <div className="space-y-4">
      <Label className="text-base font-medium">Your Location</Label>
      <div className="flex gap-2">
        <Button
          variant={mode === "gps" ? "default" : "outline"}
          onClick={() => onModeChange("gps")}
          className="flex-1"
        >
          <MapPin className="w-4 h-4 mr-2" />
          Use GPS
        </Button>
        <Button
          variant={mode === "zip" ? "default" : "outline"}
          onClick={() => onModeChange("zip")}
          className="flex-1"
        >
          <Hash className="w-4 h-4 mr-2" />
          ZIP Code
        </Button>
      </div>

      {mode === "gps" ? (
        <Button 
          onClick={onUseCurrentLocation} 
          variant={locationDetected ? "outline" : "secondary"} 
          className="w-full"
          disabled={gettingLocation}
        >
          {gettingLocation ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Getting Location...
            </>
          ) : locationDetected ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2 text-success" />
              Location Detected
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4 mr-2" />
              Get Current Location
            </>
          )}
        </Button>
      ) : (
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="12345"
            value={zipCode}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 5);
              onZipCodeChange(value);
            }}
            maxLength={5}
            className="text-center text-lg"
          />
          <p className="text-xs text-muted-foreground text-center">
            5-digit US ZIP code
          </p>
        </div>
      )}
    </div>
  );
};
