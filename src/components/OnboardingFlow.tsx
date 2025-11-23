import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MapPin, User, Camera, Mic, ArrowRight, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useVoiceInput } from "@/hooks/useVoiceInput";

interface OnboardingFlowProps {
  onComplete: (profile: OnboardingData) => void;
  userEmail: string;
}

export interface OnboardingData {
  name: string;
  zipCode: string;
  profilePicture?: string;
  voicePreferences?: {
    cuisines: string[];
    activities: string[];
    energyLevel: string;
    budget: string;
    notes: string;
  };
}

export const OnboardingFlow = ({ onComplete, userEmail }: OnboardingFlowProps) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Form data
  const [name, setName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [voiceProfileData, setVoiceProfileData] = useState<{
    cuisines: string[];
    activities: string[];
    energyLevel: string;
    budget: string;
    transcript: string;
  } | null>(null);

  const totalSteps = 4;

  // Voice input hook
  const { isListening, isProcessing, transcript, startListening } = useVoiceInput({
    onPreferencesExtracted: (prefs) => {
      setVoiceProfileData({
        cuisines: prefs.cuisinePreferences || [],
        activities: prefs.activityPreferences || [],
        energyLevel: prefs.energyLevel || "moderate",
        budget: prefs.constraints?.[0] || "moderate",
        transcript: prefs.rawTranscript,
      });

      toast({
        title: "Got it! 🎉",
        description: "Your preferences have been saved",
      });
    },
    userProfile: { home_zip: zipCode },
  });

  // Step 1: Name
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

  // Step 2: ZIP Code
  const handleZipSubmit = () => {
    if (!zipCode.trim() || zipCode.length !== 5 || !/^\d+$/.test(zipCode)) {
      toast({
        title: "Valid ZIP required",
        description: "Please enter a valid 5-digit ZIP code",
        variant: "destructive",
      });
      return;
    }
    setStep(3);
  };

  // Step 3: Profile Picture (optional)
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSkipPhoto = () => {
    setStep(4);
  };

  const handlePhotoNext = () => {
    setStep(4);
  };

  // Step 4: Voice Profile (optional)
  const handleVoiceProfile = async () => {
    startListening();
  };

  const handleSkipVoice = () => {
    handleComplete();
  };

  const handleVoiceNext = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setLoading(true);

    // Prepare profile data
    const profileData: OnboardingData = {
      name: name.trim(),
      zipCode: zipCode.trim(),
      profilePicture: profilePicture || undefined,
    };

    // If they did voice profile, include it
    if (voiceProfileData) {
      profileData.voicePreferences = {
        cuisines: voiceProfileData.cuisines,
        activities: voiceProfileData.activities,
        energyLevel: voiceProfileData.energyLevel,
        budget: voiceProfileData.budget,
        notes: voiceProfileData.transcript,
      };
    }

    setTimeout(() => {
      onComplete(profileData);
      setLoading(false);
    }, 500);
  };

  const slideVariants = {
    enter: { x: 50, opacity: 0 },
    center: { x: 0, opacity: 1 },
    exit: { x: -50, opacity: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-purple-300">Step {step} of {totalSteps}</span>
            <span className="text-sm text-purple-300">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              initial={{ width: "0%" }}
              animate={{ width: `${(step / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {/* Step 1: Name */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 space-y-6 border border-purple-500/20"
            >
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
                  <User className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white">Welcome! 👋</h2>
                <p className="text-slate-300">Let's get you set up in less than a minute</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">What's your name?</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleNameSubmit()}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 text-lg py-6"
                  autoFocus
                />
              </div>

              <Button
                onClick={handleNameSubmit}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg"
              >
                Continue <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
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
              className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 space-y-6 border border-purple-500/20"
            >
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
                  <MapPin className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white">Where are you?</h2>
                <p className="text-slate-300">We'll use this to find amazing spots near you</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode" className="text-white">ZIP Code</Label>
                <Input
                  id="zipCode"
                  type="text"
                  placeholder="90210"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleZipSubmit()}
                  maxLength={5}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 text-lg py-6 text-center tracking-widest"
                  autoFocus
                />
                <p className="text-xs text-slate-400 text-center">5-digit US ZIP code</p>
              </div>

              <Button
                onClick={handleZipSubmit}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg"
              >
                Continue <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {/* Step 3: Profile Picture (Optional) */}
          {step === 3 && (
            <motion.div
              key="step3"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 space-y-6 border border-purple-500/20"
            >
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
                  <Camera className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white">Add a photo?</h2>
                <p className="text-slate-300">Makes sharing plans with friends easier</p>
                <p className="text-xs text-slate-400">(Optional - you can skip this)</p>
              </div>

              <div className="flex flex-col items-center space-y-4">
                {profilePicture ? (
                  <div className="relative">
                    <img
                      src={profilePicture}
                      alt="Profile"
                      className="w-32 h-32 rounded-full object-cover border-4 border-purple-500"
                    />
                    <Button
                      onClick={() => setProfilePicture(null)}
                      variant="outline"
                      size="sm"
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-xs"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <div className="w-32 h-32 rounded-full border-2 border-dashed border-purple-500 flex items-center justify-center hover:bg-purple-500/10 transition-colors">
                      <Camera className="h-12 w-12 text-purple-400" />
                    </div>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="space-y-3">
                {profilePicture && (
                  <Button
                    onClick={handlePhotoNext}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg"
                  >
                    Continue <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                )}
                <Button
                  onClick={handleSkipPhoto}
                  variant="ghost"
                  className="w-full text-slate-300 hover:text-white py-6"
                >
                  Skip for now
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Voice Profile (Optional) */}
          {step === 4 && (
            <motion.div
              key="step4"
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 space-y-6 border border-purple-500/20"
            >
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-white">Tell me your style</h2>
                <p className="text-slate-300">Describe your ideal date night preferences</p>
                <p className="text-xs text-slate-400">(Optional - but makes recommendations way better!)</p>
              </div>

              {voiceProfileData ? (
                <div className="bg-slate-700/50 rounded-lg p-4 border border-purple-500/20">
                  <p className="text-sm text-slate-300 italic">"{voiceProfileData.transcript}"</p>
                </div>
              ) : (
                <Button
                  onClick={handleVoiceProfile}
                  disabled={isListening || isProcessing}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-8 text-lg"
                >
                  {isListening ? (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      >
                        <Mic className="mr-2 h-6 w-6" />
                      </motion.div>
                      Listening...
                    </>
                  ) : isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Mic className="mr-2 h-6 w-6" />
                      Tell me about your style 🎤
                    </>
                  )}
                </Button>
              )}

              <div className="space-y-3">
                {voiceProfileData && (
                  <Button
                    onClick={handleVoiceNext}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Setting up your profile...
                      </>
                    ) : (
                      <>
                        Complete Setup <Sparkles className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                )}
                <Button
                  onClick={handleSkipVoice}
                  disabled={loading}
                  variant="ghost"
                  className="w-full text-slate-300 hover:text-white py-6"
                >
                  {loading ? "Setting up..." : "Skip for now"}
                </Button>
              </div>

              <p className="text-xs text-center text-slate-400">
                You can always add this later in your profile settings
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
