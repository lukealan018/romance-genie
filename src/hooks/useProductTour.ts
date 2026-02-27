import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TourStep {
  target: string; // data-tour attribute value
  title: string;
  description: string;
  position: "bottom" | "top";
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "mode-full-night",
    title: "Pick a vibe to get started",
    description: "Tap 'Full Night Out' to plan dinner + an activity in one go.",
    position: "bottom",
  },
  {
    target: "voice-input",
    title: "Tell us what you want",
    description: "Try saying: 'Find me an upscale steakhouse with a speakeasy after'",
    position: "bottom",
  },
  {
    target: "surprise-me",
    title: "Or let us handle it",
    description: "Tap Surprise Me and we'll curate the perfect night for you.",
    position: "top",
  },
];

export const useProductTour = (hasSeenTour: boolean | null, userId: string | null) => {
  const [showTour, setShowTour] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Only show tour for authenticated users who haven't seen it
    if (hasSeenTour === false && userId && userId !== "guest-preview-user") {
      // Small delay so the page renders first
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
