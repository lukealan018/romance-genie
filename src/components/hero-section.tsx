import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Sparkles, ChevronDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HeroSectionProps {
  userName?: string;
  isLoggedIn: boolean;
  loading: boolean;
  isListening?: boolean;
  onVoiceInput: () => void;
  onSurpriseMe: () => void;
  onTogglePickers: () => void;
  showPickers: boolean;
  searchMode: "both" | "restaurant_only" | "activity_only";
  children?: React.ReactNode;
}

export const HeroSection = ({
  userName,
  isLoggedIn,
  loading,
  isListening = false,
  onVoiceInput,
  onSurpriseMe,
  onTogglePickers,
  showPickers,
  searchMode,
  children
}: HeroSectionProps) => {
  const voiceButtonText = {
    both: "Tell me about your night",
    restaurant_only: "What kind of food are you craving?",
    activity_only: "What do you want to do tonight?"
  }[searchMode];

  const toggleText = {
    both: "prefer to choose?",
    restaurant_only: "pick cuisine manually?",
    activity_only: "pick activity manually?"
  }[searchMode];

  return (
    <div className="space-y-6 pb-6">
      {/* Luxury Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative px-6 pt-8 pb-10 bg-[#11171D] border border-[rgba(255,255,255,0.06)] rounded-[18px] overflow-hidden"
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        
        <div className="relative z-10 text-center space-y-6">
          {/* Welcome Message */}
          <div className="space-y-2">
            {isLoggedIn && userName ? (
              <>
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="text-[rgba(255,255,255,0.55)] text-base">Welcome back,</p>
                  <h1 className="text-[26px] font-bold text-[rgba(255,255,255,0.9)]">
                    {userName}
                  </h1>
                </motion.div>
                <p className="text-[rgba(255,255,255,0.55)] text-sm mt-2">
                  Ready for tonight's adventure?
                </p>
              </>
            ) : (
              <>
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <h1 className="text-[26px] font-bold text-[rgba(255,255,255,0.9)]">
                    Your Perfect Night
                  </h1>
                  <p className="text-[rgba(255,255,255,0.55)] text-base mt-1">Awaits</p>
                </motion.div>
                <p className="text-[rgba(255,255,255,0.55)] text-sm max-w-sm mx-auto mt-3">
                  Stop scrolling. Stop debating. Get the perfect dinner + activity combo in seconds.
                </p>
              </>
            )}
          </div>

          {/* Primary CTA - Luxury Voice Button */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          >
            <button
              onClick={onVoiceInput}
              disabled={loading || isListening}
              className="w-full bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.25)] text-white font-medium py-5 px-6 rounded-[14px] transition-all duration-200 relative overflow-hidden disabled:opacity-50"
            >
              {/* Pulse animation when listening */}
              {isListening && (
                <motion.div
                  className="absolute inset-0 bg-primary/10"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
              
              <div className="relative z-10 flex items-center justify-center gap-3">
                {isListening ? (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    >
                      <Mic className="h-5 w-5" strokeWidth={1.5} />
                    </motion.div>
                    <span>Listening...</span>
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5" strokeWidth={1.5} />
                    <span>{voiceButtonText}</span>
                  </>
                )}
              </div>
            </button>
          </motion.div>

          {/* Toggle for manual pickers */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              variant="ghost"
              onClick={onTogglePickers}
              className="text-[rgba(255,255,255,0.45)] hover:text-[rgba(255,255,255,0.7)] hover:bg-transparent text-sm"
            >
              <span>{toggleText}</span>
              <motion.div
                animate={{ rotate: showPickers ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown className="ml-2 h-4 w-4" />
              </motion.div>
            </Button>
          </motion.div>

          {/* Secondary CTA - Surprise Me */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <button
              onClick={onSurpriseMe}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.85)] font-medium py-2.5 px-5 rounded-[12px] transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Finding magic...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                  <span>Surprise Me</span>
                </>
              )}
            </button>
          </motion.div>
        </div>
      </motion.div>

      {/* Collapsible Pickers Section */}
      <AnimatePresence>
        {showPickers && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
