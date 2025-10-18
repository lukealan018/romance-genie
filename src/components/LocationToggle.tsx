import { MapPin, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface LocationToggleProps {
  mode: "gps" | "zip";
  zipCode: string;
  onModeChange: (mode: "gps" | "zip") => void;
  onZipCodeChange: (zip: string) => void;
  onUseCurrentLocation: () => void;
}

export const LocationToggle = ({
  mode,
  zipCode,
  onModeChange,
  onZipCodeChange,
  onUseCurrentLocation,
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
        <Button onClick={onUseCurrentLocation} variant="secondary" className="w-full">
          Get Current Location
        </Button>
      ) : (
        <Input
          type="text"
          placeholder="Enter ZIP code"
          value={zipCode}
          onChange={(e) => onZipCodeChange(e.target.value)}
          maxLength={5}
          className="text-center text-lg"
        />
      )}
    </div>
  );
};
