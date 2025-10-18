import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, MapPin, Utensils, Sparkles } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";

interface FinalStepProps {
  data: OnboardingData;
  onSave: () => void;
  onBack: () => void;
  isLoading: boolean;
}

const FinalStep = ({ data, onSave, onBack, isLoading }: FinalStepProps) => {
  return (
    <Card className="border-2">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">You're All Set!</CardTitle>
        <CardDescription>
          Review your preferences below
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="space-y-4 bg-muted/30 p-4 rounded-lg">
          {data.nickname && (
            <div>
              <p className="text-sm font-semibold mb-1">Nickname</p>
              <p className="text-muted-foreground">{data.nickname}</p>
            </div>
          )}
          
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-1 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1">Location</p>
              <p className="text-muted-foreground">
                ZIP {data.home_zip} • {data.default_radius_mi} mile radius
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Utensils className="w-4 h-4 mt-1 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1">Cuisines</p>
              <p className="text-muted-foreground">
                {data.cuisines.map(c => c.replace("_", " ")).join(", ")}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 mt-1 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-semibold mb-1">Activities</p>
              <p className="text-muted-foreground">
                {data.activities.map(a => a.replace("_", " ")).join(", ")}
              </p>
            </div>
          </div>

          {data.dietary.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-1">Dietary</p>
              <p className="text-muted-foreground">
                {data.dietary.map(d => d.replace("_", " ")).join(", ")}
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button onClick={onBack} variant="outline" className="flex-1" disabled={isLoading}>
            Back
          </Button>
          <Button onClick={onSave} className="flex-1" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save & Start"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinalStep;
