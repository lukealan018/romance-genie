import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { MapPin } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";

interface LocationStepProps {
  data: OnboardingData;
  onUpdate: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const LocationStep = ({ data, onUpdate, onNext, onBack }: LocationStepProps) => {
  const [zipError, setZipError] = useState("");

  const validateAndNext = () => {
    if (!data.home_zip) {
      setZipError("Please enter your ZIP code");
      return;
    }
    if (!/^\d{5}$/.test(data.home_zip)) {
      setZipError("Please enter a valid 5-digit ZIP code");
      return;
    }
    setZipError("");
    onNext();
  };

  return (
    <Card className="border-2">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <MapPin className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Your Location</CardTitle>
        <CardDescription>
          We'll find great spots near you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="zip">Home ZIP Code *</Label>
          <Input
            id="zip"
            type="text"
            placeholder="12345"
            value={data.home_zip}
            onChange={(e) => {
              onUpdate({ home_zip: e.target.value });
              setZipError("");
            }}
            maxLength={5}
            className={zipError ? "border-destructive" : ""}
          />
          {zipError && (
            <p className="text-sm text-destructive">{zipError}</p>
          )}
        </div>

        <div className="space-y-3">
          <Label>Default Search Radius</Label>
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>3 miles</span>
            <span className="text-lg font-semibold text-foreground">
              {data.default_radius_mi} miles
            </span>
            <span>15 miles</span>
          </div>
          <Slider
            value={[data.default_radius_mi]}
            onValueChange={(value) => onUpdate({ default_radius_mi: value[0] })}
            min={3}
            max={15}
            step={1}
            className="w-full"
          />
        </div>

        <div className="flex gap-3">
          <Button onClick={onBack} variant="outline" className="flex-1">
            Back
          </Button>
          <Button onClick={validateAndNext} className="flex-1">
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationStep;
