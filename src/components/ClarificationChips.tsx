import { motion, AnimatePresence } from "framer-motion";

interface ClarificationChipsProps {
  options: string[];
  onSelect: (option: string) => void;
  onDismiss: () => void;
}

export const ClarificationChips = ({ options, onSelect, onDismiss }: ClarificationChipsProps) => {
  if (!options || options.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.35 }}
        className="mt-4 flex flex-col items-center gap-3"
      >
        <p className="text-sm font-medium" style={{ color: 'var(--chip-text)' }}>
          What kind of vibe? 🤔
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {options.map((option, i) => (
            <motion.button
              key={option}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => onSelect(option)}
              className="pill-chip pill-chip-inactive hover:pill-chip-active transition-all duration-200 cursor-pointer"
              style={{
                padding: '8px 18px',
                borderRadius: '9999px',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              {option}
            </motion.button>
          ))}
        </div>
        <button
          onClick={onDismiss}
          className="text-xs mt-1 opacity-50 hover:opacity-80 transition-opacity"
          style={{ color: 'var(--chip-text)' }}
        >
          Cancel
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
