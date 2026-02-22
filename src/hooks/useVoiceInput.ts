import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Types for the AI-extracted preferences
export interface VoicePreferences {
  restaurantRequest?: {
    type: string;
    location: string | null;
  };
  activityRequest?: {
    type: string;
    location: string | null;
  };
  generalLocation?: string | null;
  energyLevel: "low" | "medium" | "high";
  mood: "romantic" | "fun" | "adventurous" | "chill" | "celebratory";
  cuisinePreferences: string[];
  activityPreferences: string[];
  constraints: string[];
  locationMention?: string;
  rawTranscript: string;
  intent?: "surprise" | "specific" | "flexible";
  noveltyLevel?: "safe" | "adventurous" | "wild";
  mustHaves?: string[];
  avoidances?: string[];
  mode?: "both" | "restaurant_only" | "activity_only";
  restaurantSubtype?: string;
  activitySubtype?: string;
  restaurantQueryBundles?: string[];
  activityQueryBundles?: string[];
  negativeKeywords?: string[];
  needsClarification?: boolean;
  clarificationOptions?: string[];
  occasion?: string;
  groupContext?: string;
  weatherWarning?: string;
  searchDate?: string;
  searchTime?: string;
  searchDateAmbiguous?: boolean;
  searchDateOptions?: any[];
  venueType?: string;
  // Phase 1: New structured PlanRequest fields
  planIntent?: "dinner_and_show" | "dinner_and_activity" | "restaurant_only" | "activity_only" | "quick_bite" | null;
  budgetSignal?: "cheap" | "moderate" | "upscale" | null;
  budgetConstraints?: {
    excludeFastFood: boolean;
    chainHandling: "soft" | "hard" | "none";
    maxBudgetDollars: number | null;
  };
  confidence?: {
    mode: number;
    location: number;
    datetime: number;
    activity: number;
    budget: number;
    overall: number;
  };
}

interface CurrentWeather {
  temperature: number;
  description: string;
  isRaining: boolean;
}

interface UseVoiceInputProps {
  onPreferencesExtracted: (preferences: VoicePreferences) => void;
  userProfile?: {
    cuisines?: string[];
    activities?: string[];
    home_zip?: string;
  };
  currentWeather?: CurrentWeather | null;
}

export const useVoiceInput = ({ onPreferencesExtracted, userProfile, currentWeather }: UseVoiceInputProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");

  // Check if browser supports speech recognition
  const isSpeechRecognitionSupported =
    'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;

  const startListening = useCallback(async () => {
    // Check browser support
    if (!isSpeechRecognitionSupported) {
      toast({
        title: "Voice not supported",
        description: "Your browser doesn't support voice input. Try typing instead!",
        variant: "destructive",
      });
      return;
    }

    // Request microphone permission
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "We need microphone access to listen to you. Check your browser settings.",
        variant: "destructive",
      });
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;  // Keep listening continuously
    recognition.interimResults = true;  // Get interim results to detect speech activity
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    let silenceTimer: NodeJS.Timeout | null = null;
    let hasSpokenYet = false;
    const INITIAL_TIMEOUT = 15000; // 15 seconds before any speech
    const POST_SPEECH_TIMEOUT = 10000; // 10 seconds after speech detected (allows natural pauses)

    setIsListening(true);
    setTranscript("");

    recognition.onstart = () => {
      hasSpokenYet = false;
      // Start with longer initial timeout
      silenceTimer = setTimeout(() => {
        console.log('Initial timeout - stopping recognition');
        recognition.stop();
      }, INITIAL_TIMEOUT);
      
      console.log('Voice recognition started');
      toast({
        title: "Listening... 🎤",
        description: "Tell me about your night!",
      });
    };

    recognition.onresult = async (event: any) => {
      // Clear existing timer
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }

      const lastResult = event.results[event.results.length - 1];
      
      if (lastResult.isFinal) {
        // Final result - process immediately
        const speechResult = lastResult[0].transcript;
        setTranscript(speechResult);
        recognition.stop();
        setIsListening(false);
        setIsProcessing(true);

        toast({
          title: "Got it! 💭",
          description: "Let me think about that...",
        });

        // Send to AI for interpretation
        console.log('Final transcript captured:', speechResult);
        try {
          await interpretVoiceInput(speechResult, onPreferencesExtracted, userProfile, currentWeather);
        } catch (error) {
          console.error('Error interpreting voice:', error);
          toast({
            title: "Something went wrong",
            description: "Try typing your preferences instead.",
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      } else {
        // Interim result - user is speaking
        hasSpokenYet = true;
        // Use shorter timeout after speech detected
        silenceTimer = setTimeout(() => {
          console.log('Silence detected after speech - stopping recognition');
          recognition.stop();
        }, POST_SPEECH_TIMEOUT);
      }
    };


    recognition.onerror = (event: any) => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
      setIsListening(false);
      setIsProcessing(false);
      
      let errorMessage = "Something went wrong. Want to try again?";
      
      if (event.error === 'no-speech') {
        errorMessage = "I didn't hear anything. Want to try again?";
      } else if (event.error === 'audio-capture') {
        errorMessage = "Microphone not working. Check your settings?";
      } else if (event.error === 'not-allowed') {
        errorMessage = "Microphone access blocked. Check your browser settings.";
      }
      
      toast({
        title: "Oops!",
        description: errorMessage,
        variant: "destructive",
      });
    };

    recognition.onend = () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
      setIsListening(false);
    };

    recognition.start();
  }, [isSpeechRecognitionSupported, onPreferencesExtracted, userProfile, currentWeather]);

  return {
    isListening,
    isProcessing,
    transcript,
    startListening,
  };
};

// AI interpretation function using Lovable AI
async function interpretVoiceInput(
  transcript: string,
  onPreferencesExtracted: (preferences: VoicePreferences) => void,
  userProfile?: { cuisines?: string[]; activities?: string[]; home_zip?: string },
  currentWeather?: CurrentWeather | null
) {
  try {
    console.log('Calling interpret-voice edge function with transcript:', transcript);
    
    const { data, error } = await supabase.functions.invoke('interpret-voice', {
      body: { transcript, userProfile, currentWeather: currentWeather || undefined }
    });

    if (error) {
      console.error('Edge function error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from edge function');
    }

    console.log('Interpretation result:', data);

    const preferences: VoicePreferences = {
      restaurantRequest: data.restaurantRequest,
      activityRequest: data.activityRequest,
      generalLocation: data.generalLocation,
      cuisinePreferences: data.cuisinePreferences || [],
      activityPreferences: data.activityPreferences || [],
      energyLevel: data.energyLevel || 'medium',
      mood: data.mood || 'fun',
      constraints: data.constraints || [],
      locationMention: data.locationMention,
      rawTranscript: transcript,
      intent: data.intent || 'flexible',
      noveltyLevel: data.noveltyLevel || 'safe',
      mustHaves: data.mustHaves || [],
      avoidances: data.avoidances || [],
      mode: data.mode || 'both',
      restaurantSubtype: data.restaurantSubtype,
      activitySubtype: data.activitySubtype,
      restaurantQueryBundles: data.restaurantQueryBundles || [],
      activityQueryBundles: data.activityQueryBundles || [],
      negativeKeywords: data.negativeKeywords || [],
      needsClarification: data.needsClarification || false,
      clarificationOptions: data.clarificationOptions || [],
      occasion: data.occasion,
      groupContext: data.groupContext,
      weatherWarning: data.weatherWarning,
      searchDate: data.searchDate,
      searchTime: data.searchTime,
      searchDateAmbiguous: data.searchDateAmbiguous,
      searchDateOptions: data.searchDateOptions || [],
      venueType: data.venueType,
      // Phase 1: New PlanRequest fields
      planIntent: data.planIntent || null,
      budgetSignal: data.budgetSignal || null,
      budgetConstraints: data.budgetConstraints || { excludeFastFood: false, chainHandling: 'none', maxBudgetDollars: null },
      confidence: data.confidence || { mode: 0.5, location: 0.5, datetime: 0.5, activity: 0.5, budget: 0.5, overall: 0.5 },
    };

    onPreferencesExtracted(preferences);
    
    if (!data.needsClarification) {
      toast({
        title: "Perfect! ✨",
        description: `Looking for ${preferences.cuisinePreferences[0] || 'great'} food and ${preferences.activityPreferences[0] || 'fun'} activities!`,
      });
    }

  } catch (error) {
    console.error('Error interpreting voice input:', error);
    toast({
      title: "Using basic interpretation",
      description: "AI interpretation failed, using keyword matching",
      variant: "default"
    });
    // Fall back to basic interpretation
    const fallbackPrefs = fallbackInterpretation(transcript);
    onPreferencesExtracted(fallbackPrefs);
  }
}

// Fallback interpretation using simple keyword matching
function fallbackInterpretation(transcript: string): VoicePreferences {
  const lowerTranscript = transcript.toLowerCase();
  
  // Energy level detection
  let energyLevel: "low" | "medium" | "high" = "medium";
  if (lowerTranscript.includes('quiet') || lowerTranscript.includes('relaxed') || lowerTranscript.includes('chill')) {
    energyLevel = "low";
  } else if (lowerTranscript.includes('energetic') || lowerTranscript.includes('exciting') || lowerTranscript.includes('party')) {
    energyLevel = "high";
  }

  // Mood detection
  let mood: VoicePreferences['mood'] = "fun";
  if (lowerTranscript.includes('romantic') || lowerTranscript.includes('date')) {
    mood = "romantic";
  } else if (lowerTranscript.includes('adventure') || lowerTranscript.includes('explore')) {
    mood = "adventurous";
  } else if (lowerTranscript.includes('celebrate') || lowerTranscript.includes('birthday')) {
    mood = "celebratory";
  } else if (lowerTranscript.includes('chill') || lowerTranscript.includes('relax')) {
    mood = "chill";
  }

  // Cuisine detection (simple keyword matching)
  const cuisines: string[] = [];
  const cuisineKeywords = ['italian', 'mexican', 'chinese', 'japanese', 'thai', 'indian', 'pizza', 'sushi', 'burger', 'steak'];
  cuisineKeywords.forEach(cuisine => {
    if (lowerTranscript.includes(cuisine)) {
      cuisines.push(cuisine.charAt(0).toUpperCase() + cuisine.slice(1));
    }
  });

  // Activity detection
  const activities: string[] = [];
  const activityKeywords = ['movie', 'concert', 'museum', 'bar', 'music', 'theater', 'park', 'bowling', 'arcade'];
  activityKeywords.forEach(activity => {
    if (lowerTranscript.includes(activity)) {
      activities.push(activity.charAt(0).toUpperCase() + activity.slice(1));
    }
  });

  return {
    energyLevel,
    mood,
    cuisinePreferences: cuisines,
    activityPreferences: activities,
    constraints: [],
    rawTranscript: transcript
  };
}
