import { useState, useCallback } from "react";
import { toast } from "@/hooks/use-toast";

// Types for the AI-extracted preferences
export interface VoicePreferences {
  energyLevel: "low" | "medium" | "high";
  mood: "romantic" | "fun" | "adventurous" | "chill" | "celebratory";
  cuisinePreferences: string[];
  activityPreferences: string[];
  constraints: string[];
  locationMention?: string;
  rawTranscript: string;
}

interface UseVoiceInputProps {
  onPreferencesExtracted: (preferences: VoicePreferences) => void;
  userProfile?: {
    cuisines?: string[];
    activities?: string[];
    home_zip?: string;
  };
}

export const useVoiceInput = ({ onPreferencesExtracted, userProfile }: UseVoiceInputProps) => {
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

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    setIsListening(true);
    setTranscript("");

    recognition.onstart = () => {
      toast({
        title: "Listening... 🎤",
        description: "Tell me about your night!",
      });
    };

    recognition.onresult = async (event: any) => {
      const speechResult = event.results[0][0].transcript;
      setTranscript(speechResult);
      setIsListening(false);
      setIsProcessing(true);

      toast({
        title: "Got it! 💭",
        description: "Let me think about that...",
      });

      // Send to AI for interpretation
      try {
        const preferences = await interpretVoiceInput(speechResult, userProfile);
        onPreferencesExtracted(preferences);
        
        toast({
          title: "Perfect! ✨",
          description: `Looking for ${preferences.cuisinePreferences[0] || 'great'} food and ${preferences.activityPreferences[0] || 'fun'} activities!`,
        });
      } catch (error) {
        console.error('Error interpreting voice:', error);
        toast({
          title: "Hmm, I'm not sure I got that",
          description: "Want to try again or just pick from the options?",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    };

    recognition.onerror = (event: any) => {
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
      setIsListening(false);
    };

    recognition.start();
  }, [isSpeechRecognitionSupported, onPreferencesExtracted, userProfile]);

  return {
    isListening,
    isProcessing,
    transcript,
    startListening,
  };
};

// AI interpretation function using Claude
async function interpretVoiceInput(
  transcript: string,
  userProfile?: { cuisines?: string[]; activities?: string[]; home_zip?: string }
): Promise<VoicePreferences> {
  try {
    // Build the system prompt with user context
    const systemPrompt = `You are a helpful assistant that extracts user preferences from natural language about planning a night out.

User Profile Context:
${userProfile?.cuisines ? `- Favorite cuisines: ${userProfile.cuisines.join(', ')}` : ''}
${userProfile?.activities ? `- Favorite activities: ${userProfile.activities.join(', ')}` : ''}
${userProfile?.home_zip ? `- Home location: ${userProfile.home_zip}` : ''}

Extract the following from the user's message:
1. Energy level (low/medium/high)
2. Mood (romantic/fun/adventurous/chill/celebratory)
3. Cuisine preferences (array of strings)
4. Activity preferences (array of strings)
5. Any constraints or requirements
6. Any location mentions

Return ONLY a JSON object with this structure:
{
  "energyLevel": "low" | "medium" | "high",
  "mood": "romantic" | "fun" | "adventurous" | "chill" | "celebratory",
  "cuisinePreferences": string[],
  "activityPreferences": string[],
  "constraints": string[],
  "locationMention": string | undefined
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `${systemPrompt}\n\nUser message: "${transcript}"`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error('AI interpretation failed');
    }

    const data = await response.json();
    const extractedData = JSON.parse(data.content[0].text);

    return {
      ...extractedData,
      rawTranscript: transcript
    };
  } catch (error) {
    console.error('Error with AI interpretation, using fallback:', error);
    return fallbackInterpretation(transcript);
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
