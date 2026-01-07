import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Heart, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';

interface InviteHeroProps {
  hostName: string;
  intent?: string;
  scheduledDate?: string;
  scheduledTime?: string;
}

const InviteHero: React.FC<InviteHeroProps> = ({
  hostName,
  intent,
  scheduledDate,
  scheduledTime,
}) => {
  const formattedDate = scheduledDate
    ? format(new Date(scheduledDate), 'EEEE, MMMM do')
    : null;

  const formattedTime = scheduledTime
    ? scheduledTime.substring(0, 5)
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="text-center py-8 px-4"
    >
      {/* Animated sparkle icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-6"
      >
        <Sparkles className="w-8 h-8 text-primary" />
      </motion.div>

      {/* Main invitation text */}
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-2xl md:text-3xl font-bold text-foreground mb-3"
      >
        You're Invited!
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-lg text-muted-foreground mb-4"
      >
        <span className="text-primary font-semibold">{hostName}</span> has planned something special
      </motion.p>

      {/* Intent message if provided */}
      {intent && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 border border-border/50 mb-4"
        >
          <Heart className="w-4 h-4 text-primary" />
          <span className="text-sm text-foreground/80 italic">"{intent}"</span>
        </motion.div>
      )}

      {/* Date and time display */}
      {(formattedDate || formattedTime) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex items-center justify-center gap-4 mt-4 text-sm text-muted-foreground"
        >
          {formattedDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              <span>{formattedDate}</span>
            </div>
          )}
          {formattedTime && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              <span>{formattedTime}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Decorative glow */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>
    </motion.div>
  );
};

export default InviteHero;
