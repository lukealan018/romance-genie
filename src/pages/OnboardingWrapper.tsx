import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingFlow, OnboardingData } from "@/components/OnboardingFlow";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export default function OnboardingWrapper() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    // Fetch current user email
    const fetchUser = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        navigate("/login");
        return;
      }
      setUserEmail(user.email || "");
    };
    fetchUser();
  }, [navigate]);

  const handleComplete = async (profile: OnboardingData) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        throw new Error("No user found");
      }

      const profileData = {
        nickname: profile.name,
        home_zip: profile.zipCode,
        profile_picture_url: profile.profilePicture || null,
        voice_notes: profile.voicePreferences?.notes || null,
        cuisines: profile.voicePreferences?.cuisines || [],
        activities: profile.voicePreferences?.activities || [],
        energy_level: profile.voicePreferences?.energyLevel || null,
        price_range: profile.voicePreferences?.budget || null,
        default_radius_mi: 5, // default
      };

      const { error } = await supabase.functions.invoke('profile', {
        body: profileData,
      });

      if (error) throw error;

      toast({
        title: "Profile created! 🎉",
        description: "Welcome to your personalized date night planner",
      });

      navigate('/');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error saving profile",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return <OnboardingFlow onComplete={handleComplete} userEmail={userEmail} />;
}
