import React from 'react';
import { motion } from 'framer-motion';
import { Users, Check, HelpCircle, X } from 'lucide-react';

interface ResponseCounts {
  in?: number;
  maybe?: number;
  out?: number;
  suggest_change?: number;
}

interface InviteStatusProps {
  responseCounts: ResponseCounts;
  totalResponses: number;
  inviteeCount: number;
}

const InviteStatus: React.FC<InviteStatusProps> = ({ 
  responseCounts, 
  totalResponses, 
  inviteeCount 
}) => {
  if (totalResponses === 0) return null;

  const inCount = responseCounts.in || 0;
  const maybeCount = responseCounts.maybe || 0;
  const outCount = responseCounts.out || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1 }}
      className="mt-6 p-4 rounded-2xl bg-card/50 border border-border/30"
    >
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-foreground">
          {totalResponses} of {inviteeCount} responded
        </span>
      </div>

      {/* Summary counts */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        {inCount > 0 && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10">
            <Check className="w-3.5 h-3.5 text-green-400" />
            <span className="text-green-400 font-medium">{inCount} in</span>
          </span>
        )}
        {maybeCount > 0 && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10">
            <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-yellow-400 font-medium">{maybeCount} maybe</span>
          </span>
        )}
        {outCount > 0 && (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10">
            <X className="w-3.5 h-3.5 text-red-400" />
            <span className="text-red-400 font-medium">{outCount} out</span>
          </span>
        )}
      </div>
    </motion.div>
  );
};

export default InviteStatus;
