import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { OnboardingData } from "@/pages/Onboarding";

interface WelcomeStepProps {
  data: OnboardingData;
  onUpdate: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
}

const WelcomeStep = ({ data, onUpdate, onNext }: WelcomeStepProps) => {
  return (
    <Card className="border-2">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Heart className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Welcome!</CardTitle>
        <CardDescription>
          Let's personalize your experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nickname">What should we call you? (optional)</Label>
          <Input
            id="nickname"
            type="text"
            placeholder="Your nickname"
            value={data.nickname}
            onChange={(e) => onUpdate({ nickname: e.target.value })}
            maxLength={50}
          />
        </div>
        <Button onClick={onNext} className="w-full" size="lg">
          Continue
        </Button>
      </CardContent>
    </Card>
  );
};

export default WelcomeStep;
