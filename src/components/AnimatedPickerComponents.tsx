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
        className={`
          relative overflow-hidden transition-all duration-300
          ${isSelected 
            ? 'bg-[#3A7AFE]/10 border-[#3A7AFE] !text-[#3A7AFE] hover:bg-[#3A7AFE]/15 hover:!text-[#3A7AFE]' 
            : 'bg-slate-800/50 hover:bg-slate-700/50 border-slate-600/50 hover:border-[#3A7AFE]/50 text-slate-300 hover:text-white'
          }
        `}
      >
        {/* Subtle glow effect on selection */}
        {isSelected && (
          <motion.div
            className="absolute inset-0 bg-[#3A7AFE]/5"
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
        
        {/* Hover gradient overlay - ghost trail */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-[#3A7AFE]/0 via-[#3A7AFE]/15 to-[#3A7AFE]/0"
          initial={{ x: '-100%' }}
          whileHover={{ x: '100%' }}
          transition={{ duration: 0.72 }}
        />
        
        {/* Content */}
        <div className={`relative z-10 flex items-center gap-2 ${isSelected ? 'text-[#3A7AFE]' : ''}`}>
          {Icon && <Icon className={`h-4 w-4 ${isSelected ? 'text-[#3A7AFE]' : ''}`} />}
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
