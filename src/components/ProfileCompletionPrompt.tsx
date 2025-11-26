import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Camera, Mic } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ProfileCompletionPromptProps {
  userName: string;
  hasProfilePicture: boolean;
  hasVoicePreferences: boolean;
  onComplete: () => void;
  onDismiss: () => void;
}

export const ProfileCompletionPrompt = ({
  userName,
  hasProfilePicture,
  hasVoicePreferences,
  onComplete,
  onDismiss
}: ProfileCompletionPromptProps) => {
  const missingItems = [
    !hasProfilePicture && { icon: Camera, label: "Profile picture" },
    !hasVoicePreferences && { icon: Mic, label: "Voice preferences" }
  ].filter(Boolean);

  // If profile is complete, don't show
  if (missingItems.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4, delay: 1 }}
      className="fixed bottom-6 left-6 right-6 z-50 md:left-auto md:right-6 md:w-96"
    >
      <Card className="bg-gradient-to-br from-purple-900/95 to-pink-900/95 backdrop-blur-lg border-purple-500/30 p-6 shadow-2xl">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-purple-300 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-4">
          {/* Header */}
          <div className="pr-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-pink-400" />
              <h3 className="text-lg font-bold text-white">
                Want even better recommendations?
              </h3>
            </div>
            <p className="text-sm text-purple-200">
              Complete your profile and I'll give you spot-on suggestions every time!
            </p>
          </div>

          {/* Missing Items */}
          <div className="space-y-2">
            {missingItems.map((item, index) => {
              if (!item) return null;
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-3 text-sm text-purple-200 bg-white/5 rounded-lg p-3"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-purple-300" />
                  </div>
                  <span>Add {item.label}</span>
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <Button
            onClick={onComplete}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-6"
          >
            Complete Profile (30 sec) ✨
          </Button>

          <button
            onClick={onDismiss}
            className="w-full text-sm text-purple-300 hover:text-purple-200 transition-colors"
          >
            Maybe later
          </button>
        </div>
      </Card>
    </motion.div>
  );
};

// Hook to track if user has seen their first recommendation
export const useProfileCompletionPrompt = () => {
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);

  // Read localStorage on mount
  useEffect(() => {
    const hasSeenFirst = localStorage.getItem("hasSeenFirstRecommendation") === "true";
    const hasDismissed = localStorage.getItem("hasSeenCompletionPrompt") === "true";
    setShouldShowPrompt(hasSeenFirst && !hasDismissed);
  }, []);

  const markFirstRecommendationSeen = useCallback(() => {
    localStorage.setItem("hasSeenFirstRecommendation", "true");
    const hasDismissed = localStorage.getItem("hasSeenCompletionPrompt") === "true";
    if (!hasDismissed) {
      // 2 second delay before showing prompt
      setTimeout(() => {
        setShouldShowPrompt(true);
      }, 2000);
    }
  }, []);

  const markCompletionPromptSeen = useCallback(() => {
    localStorage.setItem("hasSeenCompletionPrompt", "true");
    setShouldShowPrompt(false);
  }, []);

  return {
    shouldShowPrompt,
    markFirstRecommendationSeen,
    markCompletionPromptSeen
  };
};
