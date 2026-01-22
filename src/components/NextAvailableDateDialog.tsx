import { useState } from "react";
import { Calendar, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface NextAvailableDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextAvailableDate: string; // YYYY-MM-DD
  nextAvailableDayName: string; // "Wednesday", "tomorrow", etc.
  onAccept: (date: string) => void;
  onDecline: () => void;
}

export function NextAvailableDateDialog({
  open,
  onOpenChange,
  nextAvailableDate,
  nextAvailableDayName,
  onAccept,
  onDecline,
}: NextAvailableDateDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAccept = () => {
    setIsLoading(true);
    onAccept(nextAvailableDate);
  };

  const handleDecline = () => {
    onOpenChange(false);
    onDecline();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/50">
        <DialogHeader className="text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mx-auto mb-3 w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <Calendar className="w-7 h-7 text-primary" />
          </motion.div>
          <DialogTitle className="text-xl">No Events Tonight</DialogTitle>
          <DialogDescription className="text-base">
            There are no live events in your area for tonight.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center"
          >
            <p className="text-sm text-muted-foreground mb-1">
              Next available events:
            </p>
            <p className="text-lg font-semibold text-foreground capitalize">
              {nextAvailableDayName}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {nextAvailableDate}
            </p>
          </motion.div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleDecline}
            className="flex-1 gap-2"
          >
            <X className="w-4 h-4" />
            No Thanks
          </Button>
          <Button
            onClick={handleAccept}
            disabled={isLoading}
            className="flex-1 gap-2"
          >
            {isLoading ? (
              "Searching..."
            ) : (
              <>
                Search {nextAvailableDayName}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
