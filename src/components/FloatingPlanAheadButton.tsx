import { CalendarClock } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface FloatingPlanAheadButtonProps {
  onClick: () => void;
  hasScheduledDate?: boolean;
}

export function FloatingPlanAheadButton({ onClick, hasScheduledDate }: FloatingPlanAheadButtonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="fixed bottom-6 right-4 z-40"
    >
      <Button
        onClick={onClick}
        className={`rounded-full px-4 py-2 shadow-lg flex items-center gap-2 ${
          hasScheduledDate 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-card text-card-foreground border border-border hover:bg-accent'
        }`}
      >
        <CalendarClock className="w-4 h-4" />
        <span className="text-sm font-medium">
          {hasScheduledDate ? 'Date Set' : 'Plan Ahead'}
        </span>
      </Button>
    </motion.div>
  );
}
