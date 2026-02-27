import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, User, ArrowRight, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface OnboardingFlowProps {
  onComplete: (profile: OnboardingData) => void;
  userEmail: string;
}

export interface OnboardingData {
  name: string;
  zipCode: string;
}

export const OnboardingFlow = ({ onComplete, userEmail }: OnboardingFlowProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [zipCode, setZipCode] = useState("");

  const totalSteps = 2;

  const handleNameSubmit = () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name to continue",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const handleZipSubmit = () => {
    if (!zipCode.trim() || zipCode.length !== 5 || !/^\d+$/.test(zipCode)) {
      toast({
        title: "Valid ZIP required",
        description: "Please enter a valid 5-digit ZIP code",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      onComplete({ name: name.trim(), zipCode: zipCode.trim() });
      setLoading(false);
    }, 400);
  };

  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 },
  };

  return (
    <div className="themed-page-bg min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Step {step} of {totalSteps}</span>
            <span className="text-sm text-muted-foreground">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--chip-bg)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "var(--btn-primary-bg)" }}
              initial={{ width: "0%" }}
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {/* Step 1: Welcome + Name */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="relative rounded-[var(--radius-lg)] p-8 space-y-6 backdrop-blur-xl overflow-hidden"
              style={{
                background: "var(--card-surface-gradient)",
                border: "1px solid var(--card-glass-border)",
                boxShadow: "var(--card-glow)",
              }}
            >
              {/* Inner shine */}
              <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--card-glass-shine)" }} />

              <div className="relative text-center space-y-2">
                <div
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                  style={{
                    background: "var(--btn-primary-bg)",
                    boxShadow: "var(--btn-primary-glow)",
                  }}
                >
                  <Sparkles className="h-8 w-8" style={{ color: "var(--btn-primary-text)" }} />
                </div>
                <h2 className="text-3xl font-bold text-foreground">Your night, figured out ✨</h2>
                <p className="text-muted-foreground">Let's get you set up in seconds</p>
              </div>

              <div className="relative space-y-2">
                <Label htmlFor="name" className="text-foreground">What should we call you?</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                  className="text-lg py-6"
                  autoFocus
                />
              </div>

              <button
                onClick={handleNameSubmit}
                className="btn-theme-secondary w-full py-4 text-lg font-medium flex items-center justify-center gap-2"
              >
                Continue <ArrowRight className="h-5 w-5" />
              </button>
            </motion.div>
          )}

          {/* Step 2: ZIP Code */}
          {step === 2 && (
            <motion.div
              key="step2"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="relative rounded-[var(--radius-lg)] p-8 space-y-6 backdrop-blur-xl overflow-hidden"
              style={{
                background: "var(--card-surface-gradient)",
                border: "1px solid var(--card-glass-border)",
                boxShadow: "var(--card-glow)",
              }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--card-glass-shine)" }} />

              <div className="relative text-center space-y-2">
                <div
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4"
                  style={{
                    background: "var(--btn-primary-bg)",
                    boxShadow: "var(--btn-primary-glow)",
                  }}
                >
                  <MapPin className="h-8 w-8" style={{ color: "var(--btn-primary-text)" }} />
                </div>
                <h2 className="text-3xl font-bold text-foreground">Where's the magic happening?</h2>
                <p className="text-muted-foreground">We'll find amazing spots near you</p>
              </div>

              <div className="relative space-y-2">
                <Label htmlFor="zipCode" className="text-foreground">ZIP Code</Label>
                <Input
                  id="zipCode"
                  type="text"
                  placeholder="90210"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleZipSubmit()}
                  maxLength={5}
                  className="text-lg py-6 text-center tracking-widest"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-center">5-digit US ZIP code</p>
              </div>

              <button
                onClick={handleZipSubmit}
                disabled={loading}
                className="btn-theme-secondary w-full py-4 text-lg font-medium flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Setting things up…
                  </>
                ) : (
                  <>
                    Let's Go <Sparkles className="h-5 w-5" />
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
