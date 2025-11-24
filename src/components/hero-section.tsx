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
    both: "Tell me about your night 🎤",
    restaurant_only: "What kind of food are you craving? 🍽️",
    activity_only: "What do you want to do tonight? 🎉"
  }[searchMode];

  const toggleText = {
    both: "prefer to choose?",
    restaurant_only: "pick cuisine manually?",
    activity_only: "pick activity manually?"
  }[searchMode];
  return (
    <div className="space-y-6 pb-6">
      {/* Animated Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative px-6 pt-8 pb-10 bg-gradient-to-br from-primary/40 via-accent/30 to-primary/40 rounded-3xl overflow-hidden"
      >
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 animate-pulse" />
        
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
                  <p className="text-muted-foreground text-lg">Welcome back,</p>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                    {userName}! 👋
                  </h1>
                </motion.div>
                <p className="text-muted-foreground text-base mt-2">
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
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                    Your Perfect Night
                  </h1>
                  <p className="text-xl text-muted-foreground mt-1">Awaits ✨</p>
                </motion.div>
                <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-3">
                  Stop scrolling. Stop debating. Get the perfect dinner + activity combo in seconds.
                </p>
              </>
            )}
          </div>

          {/* Primary CTA - Voice Button */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
          >
            <Button
              onClick={onVoiceInput}
              disabled={loading || isListening}
              className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-primary-foreground font-semibold py-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 text-lg relative overflow-hidden group"
            >
              {/* Pulse animation when listening */}
              {isListening && (
                <motion.div
                  className="absolute inset-0 bg-background/20"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
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
                      <Mic className="h-6 w-6" />
                    </motion.div>
                    <span>Listening...</span>
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-6 w-6" />
                    <span>{voiceButtonText}</span>
                  </>
                )}
              </div>
            </Button>
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
              className="text-muted-foreground hover:text-foreground text-sm"
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
            <Button
              onClick={onSurpriseMe}
              disabled={loading}
              variant="outline"
              className="border-primary/50 hover:bg-primary/10 text-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finding magic...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Surprise Me! 🎲
                </>
              )}
            </Button>
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
