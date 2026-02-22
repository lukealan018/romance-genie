import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Utensils, DollarSign, Heart, Sparkles, Check } from "lucide-react";
import { format, parseISO } from "date-fns";

interface ConfirmationBarProps {
  preferences: {
    searchDate?: string | null;
    searchTime?: string | null;
    generalLocation?: string | null;
    restaurantRequest?: { location?: string | null } | null;
    activityRequest?: { location?: string | null } | null;
    mode?: string | null;
    budgetSignal?: string | null;
    mood?: string | null;
    planIntent?: string | null;
  };
  onConfirm: () => void;
  onUpdateField: (field: string, value: string) => void;
  onDismiss: () => void;
}

const AUTO_PROCEED_MS = 4000;

// Budget cycle
const BUDGETS = ["cheap", "moderate", "upscale"] as const;
// Vibe cycle
const VIBES = ["chill", "fun", "romantic", "celebratory"] as const;

function formatDisplayTime(time: string | null | undefined): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${displayH}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function formatDisplayDate(date: string | null | undefined): string {
  if (!date) return "Tonight";
  try {
    return format(parseISO(date), "EEE");
  } catch {
    return "Tonight";
  }
}

function getModeLabel(mode: string | null | undefined, planIntent: string | null | undefined): string {
  if (planIntent === "dinner_and_show") return "Dinner + Show";
  if (planIntent === "dinner_and_activity") return "Dinner + Activity";
  if (planIntent === "quick_bite") return "Quick Bite";
  if (mode === "restaurant_only") return "Just Dinner";
  if (mode === "activity_only") return "Just Activity";
  return "Full Night";
}

export function VoiceConfirmationBar({ preferences, onConfirm, onUpdateField, onDismiss }: ConfirmationBarProps) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [progress, setProgress] = useState(0);
  const [resetKey, setResetKey] = useState(0);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setProgress(0);
    timerRef.current = setTimeout(() => {
      onConfirm();
    }, AUTO_PROCEED_MS);
  }, [onConfirm]);

  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  // Progress animation — restarts when resetKey changes
  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 100 / (AUTO_PROCEED_MS / 50), 100));
    }, 50);
    return () => clearInterval(interval);
  }, [resetKey]);

  const handleChipTap = (field: string) => {
    // Cycle to next value
    if (field === "budget") {
      const current = preferences.budgetSignal || "moderate";
      const idx = BUDGETS.indexOf(current as any);
      const next = BUDGETS[(idx + 1) % BUDGETS.length];
      onUpdateField("budgetSignal", next);
    } else if (field === "vibe") {
      const current = preferences.mood || "fun";
      const idx = VIBES.indexOf(current as any);
      const next = VIBES[(idx + 1) % VIBES.length];
      onUpdateField("mood", next);
    }
    resetTimer();
    setResetKey(k => k + 1);
  };

  const location = preferences.restaurantRequest?.location || 
    preferences.activityRequest?.location || 
    preferences.generalLocation || "Near you";

  const dateLabel = formatDisplayDate(preferences.searchDate);
  const timeLabel = formatDisplayTime(preferences.searchTime);
  const dateTimeLabel = timeLabel ? `${dateLabel} ${timeLabel}` : dateLabel;
  const modeLabel = getModeLabel(preferences.mode, preferences.planIntent);
  const budgetLabel = (preferences.budgetSignal || "usual").charAt(0).toUpperCase() + (preferences.budgetSignal || "usual").slice(1);
  const vibeLabel = (preferences.mood || "fun").charAt(0).toUpperCase() + (preferences.mood || "fun").slice(1);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: 'var(--card-bg, hsl(var(--card)))',
          border: '1px solid hsl(var(--primary) / 0.25)',
          boxShadow: '0 0 20px hsl(var(--primary) / 0.08)',
        }}
      >
        {/* Auto-proceed progress bar */}
        <div className="absolute top-0 left-0 h-0.5 transition-all" style={{
          width: `${progress}%`,
          background: 'hsl(var(--primary))',
          opacity: 0.6,
        }} />

        <div className="px-3 py-3">
          {/* Chip row */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {/* Date chip */}
            <Chip icon={<Calendar className="w-3 h-3" />} label={dateTimeLabel} />
            
            {/* Location chip */}
            <Chip icon={<MapPin className="w-3 h-3" />} label={location as string} />
            
            {/* Mode chip */}
            <Chip icon={<Utensils className="w-3 h-3" />} label={modeLabel} />
            
            {/* Budget chip - tappable */}
            <Chip 
              icon={<DollarSign className="w-3 h-3" />} 
              label={budgetLabel} 
              tappable 
              onTap={() => handleChipTap("budget")} 
            />
            
            {/* Vibe chip - tappable */}
            <Chip 
              icon={<Heart className="w-3 h-3" />} 
              label={vibeLabel} 
              tappable 
              onTap={() => handleChipTap("vibe")} 
            />

            {/* Go button */}
            <button
              onClick={onConfirm}
              className="flex-shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
              style={{
                background: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
                boxShadow: '0 0 12px hsl(var(--primary) / 0.4)',
              }}
            >
              <Check className="w-3 h-3" />
              Go
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Chip({ icon, label, tappable, onTap }: { 
  icon: React.ReactNode; 
  label: string; 
  tappable?: boolean;
  onTap?: () => void;
}) {
  return (
    <button
      onClick={tappable ? onTap : undefined}
      className={`flex-shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition-all ${
        tappable ? 'cursor-pointer active:scale-95' : 'cursor-default'
      }`}
      style={{
        background: tappable 
          ? 'hsl(var(--primary) / 0.15)' 
          : 'hsl(var(--muted) / 0.5)',
        color: 'var(--chip-text, hsl(var(--foreground) / 0.85))',
        border: tappable 
          ? '1px solid hsl(var(--primary) / 0.35)' 
          : '1px solid hsl(var(--border) / 0.3)',
        boxShadow: tappable ? '0 0 8px hsl(var(--primary) / 0.1)' : 'none',
      }}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
