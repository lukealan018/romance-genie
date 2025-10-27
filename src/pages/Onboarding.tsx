import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserId } from "@/hooks/use-user-id";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import WelcomeStep from "@/components/Onboarding/WelcomeStep";
import LocationStep from "@/components/Onboarding/LocationStep";
import AIChatPreferencesStep from "@/components/Onboarding/AIChatPreferencesStep";
import FinalStep from "@/components/Onboarding/FinalStep";

export interface OnboardingData {
  nickname: string;
  home_zip: string;
  default_radius_mi: number;
  cuisines: string[];
  activities: string[];
  dietary: string[];
}

const Onboarding = () => {
  const navigate = useNavigate();
  const userId = useUserId();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState<OnboardingData>({
    nickname: "",
    home_zip: "",
    default_radius_mi: 7,
    cuisines: [],
    activities: [],
    dietary: [],
  });

  const updateFormData = (data: Partial<OnboardingData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    setStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setStep((prev) => prev - 1);
  };

  const handleSave = async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('profile', {
        body: {
          nickname: formData.nickname || "Friend",
          home_zip: formData.home_zip,
          default_radius_mi: formData.default_radius_mi,
          cuisines: formData.cuisines,
          activities: formData.activities,
          dietary: formData.dietary.length > 0 ? formData.dietary : null,
        },
        headers: {
          'X-User-Id': userId,
        },
      });

      if (error) {
        console.error('Error saving profile:', error);
        toast.error("Failed to save profile. Please try again.");
        return;
      }

      console.log('Profile saved successfully:', data);
      localStorage.setItem("hasOnboarded", "true");
      localStorage.setItem("showOnboardingCompleteToast", "true");
      navigate("/");
    } catch (error) {
      console.error('Error during save:', error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-2 flex-1 mx-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground text-center">
            Step {step} of 4
          </p>
        </div>

        {/* Step content */}
        {step === 1 && (
          <WelcomeStep
            data={formData}
            onUpdate={updateFormData}
            onNext={handleNext}
          />
        )}
        {step === 2 && (
          <LocationStep
            data={formData}
            onUpdate={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {step === 3 && (
          <AIChatPreferencesStep
            data={formData}
            onUpdate={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}
        {step === 4 && (
          <FinalStep
            data={formData}
            onSave={handleSave}
            onBack={handleBack}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default Onboarding;
