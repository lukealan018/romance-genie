import { motion } from "framer-motion";
import { Utensils, PartyPopper, Heart } from "lucide-react";

export type SearchMode = "both" | "restaurant_only" | "activity_only";

interface ModeSelectionProps {
  selectedMode: SearchMode | null;
  onModeSelect: (mode: SearchMode) => void;
}

export const ModeSelection = ({ selectedMode, onModeSelect }: ModeSelectionProps) => {
  const modes = [
    {
      id: "both" as SearchMode,
      icon: Heart,
      title: "Full Date Night",
      subtitle: "Dinner + Activity",
    },
    {
      id: "restaurant_only" as SearchMode,
      icon: Utensils,
      title: "Just Dinner",
      subtitle: "Find the perfect spot",
    },
    {
      id: "activity_only" as SearchMode,
      icon: PartyPopper,
      title: "Just Activity",
      subtitle: "Something fun to do",
    },
  ];

  return (
    <div className="space-y-6 pb-6 pt-16">
      {/* Header */}
      <div className="text-center">
        <h2 
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--header-title-color)', transition: 'color 0.35s ease' }}
        >
          What's the vibe tonight?
        </h2>
        <p style={{ color: 'var(--supporting-text-color)', opacity: 0.7 }} className="text-sm">
          Choose what you're looking for
        </p>
      </div>

      {/* Mode Cards - Glassmorphism with neon glow */}
      <div className="grid grid-cols-1 gap-4 px-4">
        {modes.map((mode, index) => {
          const Icon = mode.icon;
          const isSelected = selectedMode === mode.id;

          return (
            <motion.button
              key={mode.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onModeSelect(mode.id)}
              className="card-glass relative overflow-hidden p-6 text-left"
              style={{
                background: isSelected 
                  ? 'var(--chip-selected-bg)' 
                  : 'var(--card-surface-gradient)',
                border: isSelected 
                  ? '2px solid var(--chip-selected-border)' 
                  : '1.5px solid var(--card-glass-border)',
                boxShadow: isSelected 
                  ? 'var(--chip-selected-glow), var(--card-glow)' 
                  : 'var(--card-glow)',
              }}
            >
              {/* Inner shine overlay */}
              <div 
                className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none"
                style={{
                  background: isSelected 
                    ? 'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, transparent 100%)'
                    : 'var(--card-glass-shine)',
                  borderRadius: '18px 18px 50% 50%',
                }}
              />

              {/* Background glow effect when selected */}
              {isSelected && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{ opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  style={{
                    background: `radial-gradient(circle at center, var(--glow-primary) 0%, transparent 70%)`,
                  }}
                />
              )}

              {/* Content */}
              <div className="relative z-10 flex items-center gap-4">
                {/* Icon Circle - Glassmorphic */}
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center relative overflow-hidden"
                  style={{
                    background: isSelected 
                      ? 'rgba(255,255,255,0.18)' 
                      : 'rgba(var(--theme-accent-rgb), 0.25)',
                    border: isSelected 
                      ? '1.5px solid rgba(255,255,255,0.25)' 
                      : '1.5px solid rgba(var(--theme-accent-rgb), 0.4)',
                    boxShadow: isSelected 
                      ? '0 0 20px var(--glow-primary)'
                      : '0 0 15px rgba(var(--theme-accent-rgb), 0.2)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  {/* Icon shine */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.11) 0%, transparent 100%)',
                      borderRadius: '50%',
                    }}
                  />
                  <Icon 
                    className="h-7 w-7 relative z-10" 
                    style={{ 
                      color: isSelected ? 'rgba(255,255,255,0.95)' : 'var(--theme-accent-light)',
                      filter: `drop-shadow(0 0 6px ${isSelected ? 'rgba(255,255,255,0.5)' : 'var(--glow-primary)'})`,
                    }} 
                  />
                </div>

                {/* Text */}
                <div className="flex-1">
                  <h3 
                    className="text-xl font-bold"
                    style={{ 
                      color: isSelected ? 'rgba(255,255,255,0.98)' : 'var(--header-title-color)',
                      textShadow: isSelected ? '0 0 20px currentColor' : 'none',
                    }}
                  >
                    {mode.title}
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: isSelected ? 'rgba(255,255,255,0.8)' : 'var(--supporting-text-color)' }}
                  >
                    {mode.subtitle}
                  </p>
                </div>

                {/* Selected indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-7 h-7 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(255,255,255,0.95)',
                      boxShadow: '0 0 15px rgba(255,255,255,0.5)',
                    }}
                  >
                    <svg
                      className="w-4 h-4"
                      style={{ color: 'var(--theme-accent)' }}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path d="M5 13l4 4L19 7"></path>
                    </svg>
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
