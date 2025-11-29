import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  price_range?: string;
  dislikes?: string[];
  party_size?: number;
  vibe?: string;
  planning_style?: string;
}

const Onboarding = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  
  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      
      if (!session) {
        navigate("/login");
        return;
      }
      
      setUserId(session.user.id);
    };
    
    checkAuth();
  }, [navigate]);
  
  const [formData, setFormData] = useState<OnboardingData>({
    nickname: "",
    home_zip: "",
    default_radius_mi: 7,
    cuisines: [],
    activities: [],
    dietary: [],
    price_range: undefined,
    dislikes: [],
    party_size: 2,
    vibe: undefined,
    planning_style: undefined,
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
    if (!userId) {
      toast.error("Authentication required. Please log in.");
      navigate("/login");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      
      if (!session) {
        toast.error("Authentication required. Please log in.");
        navigate("/login");
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('profile', {
        body: {
          nickname: formData.nickname || "Friend",
          home_zip: formData.home_zip,
          default_radius_mi: formData.default_radius_mi,
          cuisines: formData.cuisines,
          activities: formData.activities,
          dietary: formData.dietary.length > 0 ? formData.dietary : null,
          price_range: formData.price_range,
          dislikes: formData.dislikes && formData.dislikes.length > 0 ? formData.dislikes : null,
          party_size: formData.party_size,
          vibe: formData.vibe,
          planning_style: formData.planning_style,
        },
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        toast.error("Failed to save profile. Please try again.");
        return;
      }
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
        {/* Theme toggle */}
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>
        
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
