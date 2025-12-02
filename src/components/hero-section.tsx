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
    <div className="space-y-6 py-5 relative">
      {/* Background gradient behind hero area */}
      <div 
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background: 'linear-gradient(180deg, #11171D 0%, rgba(58,122,254,0.10) 50%, #0A0E12 100%)',
        }}
      />
      
      {/* Hero card outer glow */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] aspect-square pointer-events-none -z-10"
        style={{
          background: 'radial-gradient(circle, rgba(58,122,254,0.18) 0%, rgba(120,80,255,0.10) 40%, transparent 70%)',
          filter: 'blur(48px)',
        }}
      />
      
      {/* Luxury Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative px-6 pt-8 pb-10 bg-[#11171D] border border-[rgba(255,255,255,0.06)] rounded-[18px] overflow-hidden"
      >
        {/* Signature luxury radial glow inside card */}
        <div 
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] aspect-square pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(58,122,254,0.16) 0%, rgba(120,80,255,0.10) 40%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        
        {/* Subtle gradient overlay at top */}
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(255,255,255,0.02)] to-transparent pointer-events-none" />
        
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
                  <p className="text-[rgba(255,255,255,0.72)] text-base">Welcome back,</p>
                  <h1 className="text-[34px] font-bold text-[rgba(58,122,254,0.9)]">
                    {userName}
                  </h1>
                </motion.div>
                <p className="text-[rgba(255,255,255,0.72)] text-sm mt-2">
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
              <h1 className="text-[38px] font-bold text-[rgba(58,122,254,0.9)]">
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

          {/* Primary CTA - Luxury Matte Voice Button */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
            className="relative"
          >
            {/* Button glow underneath - enhanced when listening */}
            <motion.div 
              className="absolute inset-0 pointer-events-none"
              animate={{
                opacity: isListening ? 1 : 0.8,
              }}
              style={{
                background: isListening 
                  ? 'radial-gradient(ellipse 90% 70% at 50% 100%, rgba(58,122,254,0.25) 0%, transparent 70%)'
                  : 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(58,122,254,0.20) 0%, transparent 70%)',
                filter: isListening ? 'blur(40px)' : 'blur(28px)',
                transform: 'translateY(8px)',
              }}
            />
            
            {/* Breathing border glow when listening */}
            {isListening && (
              <motion.div
                className="absolute -inset-[2px] rounded-[18px] pointer-events-none"
                animate={{
                  opacity: [0.4, 0.8, 0.4],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  background: 'linear-gradient(135deg, rgba(58,122,254,0.35) 0%, rgba(120,80,255,0.25) 100%)',
                  filter: 'blur(4px)',
                }}
              />
            )}
            
            <button
              onClick={onVoiceInput}
              disabled={loading}
              className={`relative w-full font-medium py-5 px-6 rounded-[16px] transition-all duration-300 overflow-hidden ${
                isListening 
                  ? 'bg-[rgba(58,122,254,0.22)] border-2 border-[rgba(58,122,254,0.70)] text-[rgba(255,255,255,0.95)]'
                  : loading
                    ? 'bg-[rgba(255,255,255,0.08)] border-2 border-[rgba(255,255,255,0.15)] text-[rgba(255,255,255,0.90)]'
                    : 'bg-[rgba(58,122,254,0.38)] border-2 border-[rgba(58,122,254,0.95)] hover:bg-[rgba(58,122,254,0.45)] hover:border-[rgba(58,122,254,1)] text-[rgba(255,255,255,0.95)]'
              }`}
            >
              {/* Inner pulse animation when listening */}
              {isListening && (
                <motion.div
                  className="absolute inset-0 bg-[rgba(58,122,254,0.08)]"
                  animate={{ 
                    scale: [1, 1.3, 1], 
                    opacity: [0.4, 0, 0.4] 
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              
              <div className="relative z-10 flex items-center justify-center gap-3">
                {isListening ? (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Mic className="h-5 w-5 text-[#3A7AFE]" strokeWidth={2} />
                    </motion.div>
                    <span className="font-medium">Listening...</span>
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-[#3A7AFE]" />
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      Processing...
                    </motion.span>
                  </>
                ) : (
                  <>
                    <Mic className="h-5 w-5 text-[#3A7AFE]" strokeWidth={1.5} />
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
              className="text-[rgba(255,255,255,0.62)] hover:text-[rgba(255,255,255,0.8)] hover:bg-transparent text-sm"
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
            className="relative inline-block"
          >
            {/* Button glow underneath */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(58,122,254,0.10) 0%, transparent 70%)',
                filter: 'blur(18px)',
                transform: 'translateY(6px)',
              }}
            />
            <button
              onClick={onSurpriseMe}
              disabled={loading}
              className="relative inline-flex items-center justify-center gap-2 bg-[rgba(58,122,254,0.26)] border-2 border-[rgba(58,122,254,0.82)] hover:bg-[rgba(58,122,254,0.34)] hover:border-[rgba(58,122,254,0.95)] text-[rgba(255,255,255,0.95)] font-medium py-2.5 px-5 rounded-[12px] transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#3A7AFE]" />
                  <span>Finding magic...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-[#3A7AFE]" strokeWidth={1.5} />
                  <span>Surprise Me!</span>
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
