import React from 'react';
import { motion } from 'framer-motion';
import { Users, Check, HelpCircle, X } from 'lucide-react';

interface Response {
  responder_name: string;
  response: string;
  created_at: string;
}

interface InviteStatusProps {
  responses: Response[];
  inviteeCount: number;
}

const InviteStatus: React.FC<InviteStatusProps> = ({ responses, inviteeCount }) => {
  if (responses.length === 0) return null;

  const getResponseIcon = (response: string) => {
    switch (response) {
      case 'in':
        return <Check className="w-3.5 h-3.5 text-green-400" />;
      case 'maybe':
        return <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />;
      case 'out':
        return <X className="w-3.5 h-3.5 text-red-400" />;
      default:
        return <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  const getResponseLabel = (response: string) => {
    switch (response) {
      case 'in':
        return "I'm in!";
      case 'maybe':
        return 'Maybe';
      case 'out':
        return "Can't make it";
      case 'suggest_change':
        return 'Suggested change';
      default:
        return response;
    }
  };

  const inCount = responses.filter((r) => r.response === 'in').length;
  const maybeCount = responses.filter((r) => r.response === 'maybe').length;

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
          {responses.length} of {inviteeCount} responded
        </span>
      </div>

      {/* Summary */}
      <div className="flex gap-4 text-sm text-muted-foreground mb-3">
        {inCount > 0 && (
          <span className="flex items-center gap-1">
            <Check className="w-3.5 h-3.5 text-green-400" />
            {inCount} in
          </span>
        )}
        {maybeCount > 0 && (
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-yellow-400" />
            {maybeCount} maybe
          </span>
        )}
      </div>

      {/* Response list */}
      <div className="space-y-2">
        {responses.slice(0, 5).map((response, index) => (
          <div
            key={index}
            className="flex items-center gap-2 text-sm"
          >
            {getResponseIcon(response.response)}
            <span className="text-foreground">{response.responder_name || 'Guest'}</span>
            <span className="text-muted-foreground">—</span>
            <span className="text-muted-foreground">{getResponseLabel(response.response)}</span>
          </div>
        ))}
        {responses.length > 5 && (
          <p className="text-xs text-muted-foreground">
            +{responses.length - 5} more responses
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default InviteStatus;
