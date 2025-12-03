import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface AnimatedPickerButtonProps {
  label: string;
  icon?: LucideIcon;
  isSelected: boolean;
  onClick: () => void;
  delay?: number;
}

export const AnimatedPickerButton = ({
  label,
  icon: Icon,
  isSelected,
  onClick,
  delay = 0
}: AnimatedPickerButtonProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Button
        onClick={onClick}
        variant="outline"
        className="relative overflow-hidden border-[1.5px]"
        style={{
          background: isSelected ? 'var(--chip-selected-bg)' : 'var(--chip-bg)',
          borderColor: isSelected ? 'var(--chip-selected-border)' : 'var(--chip-border)',
          color: isSelected ? 'var(--chip-selected-text)' : 'var(--chip-text)',
          boxShadow: isSelected ? 'var(--chip-ghost-glow)' : 'none',
          transition: 'background 0.35s ease, box-shadow 0.42s ease, border-color 0.35s ease',
        }}
      >
        {/* Subtle glow effect on selection */}
        {isSelected && (
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(var(--theme-accent-rgb), 0.05)' }}
            animate={{
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
        
        {/* Hover gradient overlay - ghost trail extended 15-20% */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to right, transparent 0%, rgba(var(--theme-accent-rgb), 0.18) 50%, transparent 100%)',
          }}
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 1.05 }}
        />
        
        {/* Content */}
        <div 
          className="relative z-10 flex items-center gap-2"
          style={{ color: isSelected ? 'var(--chip-selected-text)' : 'var(--chip-text)' }}
        >
          {Icon && <Icon className="h-4 w-4" style={{ color: isSelected ? 'var(--chip-selected-text)' : 'var(--chip-text)' }} />}
          <span>{label}</span>
        </div>
      </Button>
    </motion.div>
  );
};

interface AnimatedPickerSectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export const AnimatedPickerSection = ({
  title,
  subtitle,
  children
}: AnimatedPickerSectionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="space-y-4"
    >
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-1"
      >
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        {subtitle && (
          <p className="text-sm text-slate-400">{subtitle}</p>
        )}
      </motion.div>
      
      {/* Content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

// Stagger animation for grid of buttons
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

export const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};
