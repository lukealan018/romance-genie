import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Utensils, Sparkles } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";

interface PreferencesStepProps {
  data: OnboardingData;
  onUpdate: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const cuisineOptions = [
  "italian",
  "mexican",
  "japanese",
  "thai",
  "sushi",
  "steakhouse",
  "vegan",
  "bbq",
  "burgers",
];

const activityOptions = [
  "comedy",
  "live_music",
  "movies",
  "bowling",
  "arcade",
  "museum",
  "escape_room",
  "mini_golf",
  "hike",
  "wine",
];

const dietaryOptions = [
  "gluten_free",
  "vegetarian",
  "vegan",
  "halal",
  "kosher",
];

const PreferencesStep = ({ data, onUpdate, onNext, onBack }: PreferencesStepProps) => {
  const [error, setError] = useState("");

  const toggleItem = (array: string[], item: string) => {
    return array.includes(item)
      ? array.filter((i) => i !== item)
      : [...array, item];
  };

  const validateAndNext = () => {
    if (data.cuisines.length === 0) {
      setError("Please select at least one cuisine");
      return;
    }
    if (data.activities.length === 0) {
      setError("Please select at least one activity");
      return;
    }
    setError("");
    onNext();
  };

  return (
    <Card className="border-2">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Your Preferences</CardTitle>
        <CardDescription>
          Help us tailor your recommendations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cuisines */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4" />
            <Label className="text-sm font-semibold">Favorite Cuisines *</Label>
          </div>
          <div className="flex flex-wrap gap-2">
            {cuisineOptions.map((cuisine) => (
              <Badge
                key={cuisine}
                variant={data.cuisines.includes(cuisine) ? "default" : "outline"}
                className="cursor-pointer hover:scale-105 transition-transform"
                onClick={() => {
                  onUpdate({ cuisines: toggleItem(data.cuisines, cuisine) });
                  setError("");
                }}
              >
                {cuisine.replace("_", " ")}
              </Badge>
            ))}
          </div>
        </div>

        {/* Activities */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Activities You Enjoy *</Label>
          <div className="flex flex-wrap gap-2">
            {activityOptions.map((activity) => (
              <Badge
                key={activity}
                variant={data.activities.includes(activity) ? "default" : "outline"}
                className="cursor-pointer hover:scale-105 transition-transform"
                onClick={() => {
                  onUpdate({ activities: toggleItem(data.activities, activity) });
                  setError("");
                }}
              >
                {activity.replace("_", " ")}
              </Badge>
            ))}
          </div>
        </div>

        {/* Dietary */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Dietary Restrictions (optional)</Label>
          <div className="flex flex-wrap gap-2">
            {dietaryOptions.map((diet) => (
              <Badge
                key={diet}
                variant={data.dietary.includes(diet) ? "default" : "outline"}
                className="cursor-pointer hover:scale-105 transition-transform"
                onClick={() => {
                  onUpdate({ dietary: toggleItem(data.dietary, diet) });
                }}
              >
                {diet.replace("_", " ")}
              </Badge>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}

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

// Add Label import
import { Label } from "@/components/ui/label";

export default PreferencesStep;
