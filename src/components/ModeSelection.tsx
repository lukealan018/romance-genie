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
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="text-center">
        <h2 
          className="text-2xl font-bold mb-2"
          style={{ color: 'var(--header-title-color)', transition: 'color 0.35s ease' }}
        >
          What's the vibe tonight?
        </h2>
        <p className="text-[rgba(255,255,255,0.55)] text-sm">
          Choose what you're looking for
        </p>
      </div>

      {/* Mode Cards - Theme aware */}
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
              onClick={() => onModeSelect(mode.id)}
              className="relative overflow-hidden rounded-[18px] p-6 text-left"
              style={{
                background: isSelected 
                  ? 'var(--btn-primary-bg)' 
                  : 'var(--card-surface-gradient)',
                border: isSelected 
                  ? '1.5px solid var(--btn-primary-border)' 
                  : '1px solid rgba(255,255,255,0.08)',
                boxShadow: isSelected 
                  ? 'var(--btn-primary-glow)' 
                  : 'none',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                transition: 'background 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease, transform 0.2s ease',
              }}
            >
              {/* Background glow effect when selected */}
              {isSelected && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  animate={{ opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    background: `radial-gradient(circle at center, var(--glow-primary) 0%, transparent 70%)`,
                  }}
                />
              )}

              {/* Content */}
              <div className="relative z-10 flex items-center gap-4">
                {/* Icon */}
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{
                    background: isSelected 
                      ? 'rgba(255,255,255,0.15)' 
                      : 'rgba(var(--theme-accent-rgb), 0.2)',
                    border: isSelected 
                      ? '1px solid rgba(255,255,255,0.2)' 
                      : '1px solid rgba(var(--theme-accent-rgb), 0.3)',
                    transition: 'background 0.35s ease, border-color 0.35s ease',
                  }}
                >
                  <Icon 
                    className="h-7 w-7" 
                    style={{ 
                      color: isSelected ? 'rgba(255,255,255,0.95)' : 'var(--theme-accent-light)',
                      transition: 'color 0.35s ease',
                    }} 
                  />
                </div>

                {/* Text */}
                <div className="flex-1">
                  <h3 
                    className="text-xl font-bold"
                    style={{ 
                      color: isSelected ? 'rgba(255,255,255,0.95)' : 'var(--header-title-color)',
                      transition: 'color 0.35s ease',
                    }}
                  >
                    {mode.title}
                  </h3>
                  <p 
                    className="text-sm"
                    style={{ color: isSelected ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.55)' }}
                  >
                    {mode.subtitle}
                  </p>
                </div>

                {/* Selected indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 rounded-full bg-white flex items-center justify-center"
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
