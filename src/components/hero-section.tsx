import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Sparkles, ChevronDown, Loader2, Ticket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HeroSectionProps {
  userName?: string;
  isLoggedIn: boolean;
  loading: boolean;
  isListening?: boolean;
  onVoiceInput: () => void;
  onSurpriseMe: (options?: { liveEventsOnly?: boolean }) => void;
  onTogglePickers: () => void;
  showPickers: boolean;
  searchMode: "both" | "restaurant_only" | "activity_only";
  children?: React.ReactNode;
}

// Surprise Me button with optional Live Events toggle
const SurpriseMeButton = ({
  loading,
  searchMode,
  onSurpriseMe
}: {
  loading: boolean;
  searchMode: "both" | "restaurant_only" | "activity_only";
  onSurpriseMe: (options?: { liveEventsOnly?: boolean }) => void;
}) => {
  const [liveEventsMode, setLiveEventsMode] = useState(false);
  const showLiveEventsToggle = searchMode === 'activity_only';

  // Reset toggle when search mode changes away from activity_only
  // This prevents stale state when user switches modes
  React.useEffect(() => {
    if (searchMode !== 'activity_only') {
      setLiveEventsMode(false);
    }
  }, [searchMode]);

  const handleClick = () => {
    onSurpriseMe({ liveEventsOnly: showLiveEventsToggle && liveEventsMode });
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLiveEventsMode(!liveEventsMode);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8 }}
      className="relative inline-flex items-center gap-2"
    >
      {/* Button glow underneath */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 100%, rgba(var(--theme-accent-rgb),0.10) 0%, transparent 70%)`,
          filter: 'blur(18px)',
          transform: 'translateY(6px)',
        }}
      />
      <button
        onClick={handleClick}
        disabled={loading}
        className="relative inline-flex items-center justify-center gap-2 font-medium py-2.5 px-5 rounded-[12px] transition-all duration-200 disabled:opacity-50"
        style={{
          background: 'var(--btn-secondary-bg)',
          border: `1.5px solid var(--btn-secondary-border)`,
          color: 'var(--btn-secondary-text)',
          boxShadow: 'var(--btn-secondary-glow)',
        }}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: '#60A5FA' }} />
            <span>Finding magic...</span>
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" style={{ color: '#FFFFFF', filter: 'drop-shadow(0 0 5px rgba(96, 165, 250, 0.9))' }} strokeWidth={2} />
            <span>Surprise Me!</span>
          </>
        )}
      </button>
      
      {/* Live Events toggle - only shown in activity_only mode */}
      {showLiveEventsToggle && !loading && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handleToggle}
          className="relative p-2.5 rounded-[10px] transition-all duration-200"
          style={{
            background: liveEventsMode 
              ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.25) 0%, rgba(234, 88, 12, 0.20) 100%)'
              : 'rgba(255,255,255,0.06)',
            border: liveEventsMode 
              ? '1.5px solid rgba(251, 146, 60, 0.6)'
              : '1.5px solid rgba(255,255,255,0.10)',
            boxShadow: liveEventsMode 
              ? '0 0 16px rgba(251, 146, 60, 0.3)'
              : 'none',
          }}
          title={liveEventsMode ? "Live Events ON - Shows concerts, comedy, theater" : "Live Events OFF - Mixed activities"}
        >
          <Ticket 
            className="h-4 w-4 transition-all duration-200" 
            style={{ 
              color: liveEventsMode ? '#fb923c' : 'rgba(255,255,255,0.5)',
              filter: liveEventsMode ? 'drop-shadow(0 0 6px rgba(251, 146, 60, 0.8))' : 'none'
            }} 
            strokeWidth={2} 
          />
        </motion.button>
      )}
    </motion.div>
  );
};

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
    <div className="space-y-6 py-5 relative" style={{ transition: 'var(--theme-transition)' }}>
      {/* Background gradient - theme aware */}
      <div 
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background: 'var(--hero-gradient)',
          transition: 'var(--theme-transition)',
        }}
      />
      
      {/* Hero card outer glow - theme aware */}
      <div 
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[50%] aspect-square pointer-events-none -z-10"
        style={{
          background: `radial-gradient(circle, var(--glow-primary) 0%, var(--glow-secondary) 40%, transparent 70%)`,
          filter: 'blur(48px)',
        }}
      />
      
      {/* Luxury Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative px-6 pt-8 pb-10 rounded-[18px] overflow-hidden"
        style={{
          background: 'var(--card-surface-gradient)',
          backdropFilter: 'blur(var(--card-blur, 20px))',
          WebkitBackdropFilter: 'blur(var(--card-blur, 20px))',
          border: '1px solid rgba(255,255,255,0.08)',
          transition: 'background 450ms ease, backdrop-filter 300ms ease',
        }}
      >
        {/* Signature luxury radial glow inside card - theme aware */}
        <div 
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40%] aspect-square pointer-events-none"
          style={{
            background: `radial-gradient(circle, var(--glow-primary) 0%, var(--glow-secondary) 40%, transparent 70%)`,
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
                  <p style={{ color: 'var(--supporting-text-color)', transition: 'var(--theme-transition)' }} className="text-base">Welcome back,</p>
                  <h1 className="text-[34px] font-bold" style={{ color: 'var(--username-color)', textShadow: 'var(--username-glow)', transition: 'var(--theme-transition)' }}>
                    {userName}
                  </h1>
                </motion.div>
                <p style={{ color: 'var(--supporting-text-color)', transition: 'var(--theme-transition)' }} className="text-sm mt-2">
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
                  <h1 className="text-[38px] font-bold" style={{ color: 'var(--theme-accent)' }}>
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

          {/* Primary CTA - Theme-aware Luxury Voice Button */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
            className="relative"
          >
            {/* Subtle radial gradient behind button - 8-10% opacity */}
            <div 
              className="absolute -inset-8 pointer-events-none -z-10"
              style={{
                background: `radial-gradient(circle at 50% 50%, rgba(var(--theme-accent-rgb), 0.09) 0%, transparent 60%)`,
                filter: 'blur(20px)',
              }}
            />
            
            {/* Button glow underneath - enhanced when listening */}
            <motion.div 
              className="absolute inset-0 pointer-events-none"
              animate={{
                opacity: isListening ? 1 : 0.8,
              }}
              style={{
                background: isListening 
                  ? `radial-gradient(ellipse 90% 70% at 50% 100%, var(--glow-primary) 0%, transparent 70%)`
                  : `radial-gradient(ellipse 80% 60% at 50% 100%, rgba(var(--theme-accent-rgb),0.20) 0%, transparent 70%)`,
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
                  background: `linear-gradient(135deg, var(--glow-primary) 0%, var(--glow-secondary) 100%)`,
                  filter: 'blur(4px)',
                }}
              />
            )}
            
            <button
              onClick={onVoiceInput}
              disabled={loading}
              className="relative w-full font-medium py-5 px-6 rounded-[16px] transition-all duration-300 overflow-hidden"
              style={{
                background: isListening 
                  ? `rgba(var(--theme-accent-rgb),0.22)`
                  : loading
                    ? 'rgba(255,255,255,0.08)'
                    : 'var(--btn-primary-bg)',
                border: isListening
                  ? `2px solid rgba(var(--theme-accent-rgb),0.70)`
                  : loading
                    ? '2px solid rgba(255,255,255,0.15)'
                    : `1.5px solid var(--btn-primary-border)`,
                color: 'var(--btn-primary-text)',
                boxShadow: !isListening && !loading ? 'var(--btn-primary-glow)' : 'none',
              }}
            >
              {/* Inner pulse animation when listening */}
              {isListening && (
                <motion.div
                  className="absolute inset-0"
                  style={{ background: `rgba(var(--theme-accent-rgb),0.08)` }}
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
                      <Mic className="h-5 w-5" style={{ color: 'var(--theme-accent)' }} strokeWidth={2} />
                    </motion.div>
                    <span className="font-medium">Listening...</span>
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--theme-accent)' }} />
                    <motion.span
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      Processing...
                    </motion.span>
                  </>
                ) : (
                  <>
                    <Mic className="h-6 w-6" style={{ color: '#FFFFFF', filter: 'drop-shadow(0 0 6px rgba(96, 165, 250, 0.8))' }} strokeWidth={2.5} />
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

          {/* Secondary CTA - Surprise Me with Live Events toggle */}
          <SurpriseMeButton 
            loading={loading}
            searchMode={searchMode}
            onSurpriseMe={onSurpriseMe}
          />
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
