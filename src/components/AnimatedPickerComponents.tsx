import { motion } from "framer-motion";
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
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="chip-luxury relative overflow-hidden"
      style={{
        background: isSelected ? 'var(--chip-selected-bg)' : 'var(--chip-bg)',
        borderColor: isSelected ? 'var(--chip-selected-border)' : 'var(--chip-border)',
        color: isSelected ? 'var(--chip-selected-text)' : 'var(--chip-text)',
        boxShadow: isSelected ? 'var(--chip-selected-glow)' : 'var(--chip-glow)',
      }}
    >
      {/* Subtle glow pulse on selection */}
      {isSelected && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'rgba(var(--theme-accent-rgb), 0.08)' }}
          animate={{
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
      
      {/* Hover gradient sweep */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(to right, transparent 0%, rgba(var(--theme-accent-rgb), 0.15) 50%, transparent 100%)',
        }}
        initial={{ x: '-100%' }}
        whileHover={{ x: '100%' }}
        transition={{ duration: 0.8 }}
      />
      
      {/* Content */}
      <div 
        className="relative z-10 flex items-center gap-2"
        style={{ color: isSelected ? 'var(--chip-selected-text)' : 'var(--chip-text)' }}
      >
        {Icon && (
          <Icon 
            className="h-4 w-4" 
            style={{ 
              color: isSelected ? 'var(--chip-selected-text)' : 'var(--chip-text)',
              filter: isSelected ? 'var(--header-icon-glow)' : 'none'
            }} 
          />
        )}
        <span className="font-medium">{label}</span>
      </div>
    </motion.button>
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
        <h3 
          className="text-xl font-semibold"
          style={{ color: 'var(--header-title-color, hsl(var(--foreground)))' }}
        >
          {title}
        </h3>
        {subtitle && (
          <p 
            className="text-sm"
            style={{ color: 'var(--supporting-text-color, hsl(var(--muted-foreground)))' }}
          >
            {subtitle}
          </p>
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
