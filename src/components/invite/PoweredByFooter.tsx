import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const PoweredByFooter: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.2 }}
      className="mt-8 pb-8 text-center"
    >
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>Powered by Andate</span>
      </a>
    </motion.div>
  );
};

export default PoweredByFooter;
