import React from 'react';
import { motion } from 'framer-motion';
import { Check, HelpCircle, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InviteActionsProps {
  onResponse: (response: 'in' | 'maybe' | 'out') => void;
  onSuggestChange: () => void;
  isSubmitting: boolean;
  hasResponded: boolean;
}

const InviteActions: React.FC<InviteActionsProps> = ({
  onResponse,
  onSuggestChange,
  isSubmitting,
  hasResponded,
}) => {
  if (hasResponded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-6"
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-4">
          <Check className="w-8 h-8 text-primary" />
        </div>
        <p className="text-lg font-medium text-foreground">Response Sent!</p>
        <p className="text-sm text-muted-foreground mt-1">
          The host has been notified
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8 }}
      className="space-y-4"
    >
      {/* Main response buttons */}
      <div className="grid grid-cols-3 gap-3">
        <Button
          onClick={() => onResponse('in')}
          disabled={isSubmitting}
          className="flex flex-col items-center gap-2 h-auto py-4 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400"
          variant="outline"
        >
          <Check className="w-6 h-6" />
          <span className="text-sm font-medium">I'm In!</span>
        </Button>

        <Button
          onClick={() => onResponse('maybe')}
          disabled={isSubmitting}
          className="flex flex-col items-center gap-2 h-auto py-4 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-400"
          variant="outline"
        >
          <HelpCircle className="w-6 h-6" />
          <span className="text-sm font-medium">Maybe</span>
        </Button>

        <Button
          onClick={() => onResponse('out')}
          disabled={isSubmitting}
          className="flex flex-col items-center gap-2 h-auto py-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400"
          variant="outline"
        >
          <X className="w-6 h-6" />
          <span className="text-sm font-medium">Can't Make It</span>
        </Button>
      </div>

      {/* Suggest change button */}
      <Button
        onClick={onSuggestChange}
        disabled={isSubmitting}
        variant="ghost"
        className="w-full text-muted-foreground hover:text-foreground"
      >
        <MessageSquare className="w-4 h-4 mr-2" />
        Suggest a Change
      </Button>
    </motion.div>
  );
};

export default InviteActions;
