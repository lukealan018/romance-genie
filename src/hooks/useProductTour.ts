import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TourStep {
  target: string; // data-tour attribute value
  title: string;
  description: string;
  position: "bottom" | "top";
  action: "click" | "observe";
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "mode-full-night",
    title: "Pick a vibe to get started",
    description: "Tap 'Full Night Out' to plan dinner + an activity in one go.",
    position: "bottom",
    action: "click",
  },
  {
    target: "voice-input",
    title: "Your voice, your night",
    description: "Tap the mic and say something like 'Italian dinner and live jazz' — we'll find the best matches.",
    position: "bottom",
    action: "observe",
  },
  {
    target: "surprise-me",
    title: "Or let us handle it",
    description: "Tap Surprise Me and we'll handle everything.",
    position: "top",
    action: "observe",
  },
];

export const useProductTour = (hasSeenTour: boolean | null, userId: string | null) => {
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Show tour for guests (preview) or authenticated users who haven't seen it
    const isGuest = userId === "guest-preview-user";
    const shouldShow = isGuest || (hasSeenTour === false && userId);
    if (shouldShow) {
      const timer = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTour, userId]);

  const markTourComplete = useCallback(async () => {
    if (!userId || userId === "guest-preview-user") return;
    try {
      await supabase
        .from("profiles")
        .update({ has_seen_tour: true } as any)
        .eq("user_id", userId);
    } catch (err) {
      console.error("Failed to mark tour complete:", err);
    }
  }, [userId]);

  const advanceStep = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setShowTour(false);
      markTourComplete();
    }
  }, [currentStep, markTourComplete]);

  const skipTour = useCallback(() => {
    setShowTour(false);
    markTourComplete();
  }, [markTourComplete]);

  return {
    showTour,
    currentStep,
    steps: TOUR_STEPS,
    advanceStep,
    skipTour,
  };
};
