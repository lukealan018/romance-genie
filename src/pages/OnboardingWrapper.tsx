import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingFlow, OnboardingData } from "@/components/OnboardingFlow";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { isPreviewEnvironment } from "@/lib/dev-utils";

export default function OnboardingWrapper() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userEmail, setUserEmail] = useState("");
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        if (isPreviewEnvironment()) {
          console.log('[GUEST MODE] No session — allowing onboarding in preview');
          setIsGuest(true);
          return;
        }
        navigate("/login");
        return;
      }
      setUserEmail(user.email || "");
    };
    fetchUser();
  }, [navigate]);

  const handleComplete = async (profile: OnboardingData) => {
    try {
      // In guest/preview mode, skip saving and go home
      if (isGuest) {
        toast({ title: "You're all set! 🎉", description: "Your night, figured out" });
        navigate("/");
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) throw new Error("No user found");

      const { error } = await supabase.functions.invoke("profile", {
        body: {
          nickname: profile.name,
          home_zip: profile.zipCode,
          default_radius_mi: 5,
        },
      });

      if (error) throw error;

      toast({ title: "You're all set! 🎉", description: "Your night, figured out" });
      navigate("/");
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error saving profile",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return <OnboardingFlow onComplete={handleComplete} userEmail={userEmail} />;
}
