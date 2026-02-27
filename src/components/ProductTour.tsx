import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TourStep } from "@/hooks/useProductTour";

interface ProductTourProps {
  steps: TourStep[];
  currentStep: number;
  onAdvance: () => void;
  onSkip: () => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const ProductTour = ({ steps, currentStep, onAdvance, onSkip }: ProductTourProps) => {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const step = steps[currentStep];

  const measureTarget = useCallback(() => {
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pad = 8;
    setRect({
      top: r.top - pad + window.scrollY,
      left: r.left - pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    });
  }, [step.target]);

  // Measure on step change + scroll/resize — poll until element appears
  useEffect(() => {
    setRect(null);
    const startTime = Date.now();
    const poll = setInterval(() => {
      const el = document.querySelector(`[data-tour="${step.target}"]`);
      if (el) {
        measureTarget();
        clearInterval(poll);
      } else if (Date.now() - startTime > 2000) {
        clearInterval(poll);
      }
    }, 200);

    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);
    return () => {
      clearInterval(poll);
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [measureTarget, currentStep, step.target]);

  // No longer needed — spotlight zone handles click + advance

  if (!rect) return null;

  // Tooltip positioning
  const tooltipStyle: React.CSSProperties = {
    position: "absolute",
    left: Math.max(16, Math.min(rect.left, window.innerWidth - 320)),
    width: Math.min(300, window.innerWidth - 32),
    zIndex: 10002,
  };

  if (step.position === "bottom") {
    tooltipStyle.top = rect.top + rect.height + 16;
  } else {
    tooltipStyle.top = rect.top - 16;
    tooltipStyle.transform = "translateY(-100%)";
  }

  return (
    <AnimatePresence>
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0"
        style={{ zIndex: 10000, pointerEvents: "none" }}
      >
        {/* Dark overlay with cutout */}
        <svg
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: "auto", minHeight: document.documentElement.scrollHeight }}
          onClick={onSkip}
        >
          <defs>
            <mask id="tour-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx={16}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.72)"
            mask="url(#tour-mask)"
          />
        </svg>

        {/* Clickable spotlight zone — passes click to target + advances tour */}
        <div
          className="absolute cursor-pointer"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: 16,
            zIndex: 10003,
            pointerEvents: "auto",
          }}
          onClick={(e) => {
            e.stopPropagation();
            // Click the real element first, then advance after a short delay
            const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
            if (el) el.click();
            setTimeout(onAdvance, 300);
          }}
        />

        {/* Glow ring around spotlight */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            borderRadius: 20,
            border: "2px solid var(--theme-accent)",
            boxShadow: "0 0 24px var(--glow-primary), 0 0 48px var(--glow-secondary)",
            zIndex: 10001,
          }}
        />

        {/* Tooltip bubble */}
        <motion.div
          key={`tooltip-${currentStep}`}
          initial={{ opacity: 0, y: step.position === "bottom" ? -8 : 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.25 }}
          style={{ ...tooltipStyle, pointerEvents: "auto" }}
        >
          <div
            className="rounded-[16px] p-5 relative overflow-hidden"
            style={{
              background: "var(--card-surface-gradient)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 0 20px var(--glow-primary)",
            }}
          >
            {/* Inner shine */}
            <div
              className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none"
              style={{
                background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)",
                borderRadius: "16px 16px 50% 50%",
              }}
            />

            <div className="relative z-10">
              <h3
                className="text-lg font-bold mb-1"
                style={{ color: "var(--header-title-color)" }}
              >
                {step.title}
              </h3>
              <p
                className="text-sm mb-4 leading-relaxed"
                style={{ color: "var(--supporting-text-color)", opacity: 0.85 }}
              >
                {step.description}
              </p>

              <div className="flex items-center justify-between">
                {/* Step dots */}
                <div className="flex gap-2">
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full transition-all duration-300"
                      style={{
                        background:
                          i === currentStep
                            ? "var(--theme-accent)"
                            : "rgba(255,255,255,0.2)",
                        boxShadow:
                          i === currentStep
                            ? "0 0 8px var(--glow-primary)"
                            : "none",
                      }}
                    />
                  ))}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSkip();
                  }}
                  className="text-xs font-medium px-3 py-1.5 rounded-full transition-all"
                  style={{
                    color: "var(--supporting-text-color)",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  Skip tour
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
