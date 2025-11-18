import { useState, useCallback } from “react”;
import { useToast } from “@/components/ui/use-toast”;

// Types for the AI-extracted preferences
export interface VoicePreferences {
energyLevel: “low” | “medium” | “high”;
mood: “romantic” | “fun” | “adventurous” | “chill” | “celebratory”;
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
const [transcript, setTranscript] = useState(””);
const { toast } = useToast();

// Check if browser supports speech recognition
const isSpeechRecognitionSupported =
‘webkitSpeechRecognition’ in window || ‘SpeechRecognition’ in window;

const startListening = useCallback(async () => {
// Check browser support
if (!isSpeechRecognitionSupported) {
toast({
title: “Voice not supported”,
description: “Your browser doesn’t support voice input. Try typing instead!”,
variant: “destructive”,
});
return;
}

```
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
```

}, [toast, onPreferencesExtracted, userProfile, isSpeechRecognitionSupported]);

return {
isListening,
isProcessing,
transcript,
startListening,
isSpeechRecognitionSupported,
};
};

// AI Interpretation Function - Calls Claude API
async function interpretVoiceInput(
transcript: string,
userProfile?: { cuisines?: string[]; activities?: string[]; home_zip?: string }
): Promise<VoicePreferences> {

const systemPrompt = `You are an AI assistant helping users plan date nights. Extract preferences from their voice input.

${userProfile ? `User’s saved preferences:

- Favorite cuisines: ${userProfile.cuisines?.join(’, ’) || ‘none saved’}
- Favorite activities: ${userProfile.activities?.join(’, ’) || ‘none saved’}
- Home location: ${userProfile.home_zip || ‘not set’}` : ‘’}

Analyze the user’s statement and extract:

1. Energy level (low/medium/high) - based on words like “tired”, “exhausted” (low), “ready to go”, “pumped” (high)
1. Mood (romantic/fun/adventurous/chill/celebratory)
1. Cuisine preferences (Italian, Mexican, Japanese, Chinese, Thai, American, Indian, French, Mediterranean)
1. Activity preferences (live_music, comedy, movies, bowling, arcade, museum, escape_room, mini_golf, hike, wine)
1. Constraints (budget-conscious, quick dinner, quiet place, outdoor, indoor, etc.)
1. Location mentions (any neighborhood or city they mention)

CRITICAL: Respond ONLY with valid JSON. No explanations, no markdown, no backticks. Just the JSON object.

Format:
{
“energyLevel”: “low” | “medium” | “high”,
“mood”: “romantic” | “fun” | “adventurous” | “chill” | “celebratory”,
“cuisinePreferences”: [“Italian”, “Japanese”],
“activityPreferences”: [“wine”, “movies”],
“constraints”: [“quiet”, “budget-conscious”],
“locationMention”: “Beverly Hills” or null,
“reasoning”: “Brief explanation of interpretation”
}`;

const userMessage = `User said: “${transcript}”

Extract their preferences and respond with ONLY the JSON object. DO NOT include any markdown formatting, backticks, or explanations outside the JSON.`;

try {
const response = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: {
“Content-Type”: “application/json”,
},
body: JSON.stringify({
model: “claude-sonnet-4-20250514”,
max_tokens: 1000,
messages: [
{
role: “user”,
content: `${systemPrompt}\n\n${userMessage}`
}
]
})
});

```
if (!response.ok) {
  throw new Error(`API request failed: ${response.status}`);
}

const data = await response.json();
let responseText = data.content[0].text;

// Strip markdown formatting if present
responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

const parsed = JSON.parse(responseText);

return {
  energyLevel: parsed.energyLevel || "medium",
  mood: parsed.mood || "fun",
  cuisinePreferences: parsed.cuisinePreferences || [],
  activityPreferences: parsed.activityPreferences || [],
  constraints: parsed.constraints || [],
  locationMention: parsed.locationMention || undefined,
  rawTranscript: transcript,
};
```

} catch (error) {
console.error(‘Error calling Claude API:’, error);

```
// Fallback: basic keyword matching if AI fails
return fallbackInterpretation(transcript);
```

}
}

// Simple fallback if AI interpretation fails
function fallbackInterpretation(transcript: string): VoicePreferences {
const lowerTranscript = transcript.toLowerCase();

// Energy detection
let energyLevel: “low” | “medium” | “high” = “medium”;
if (lowerTranscript.match(/tired|exhausted|chill|relaxed|low.key/)) {
energyLevel = “low”;
} else if (lowerTranscript.match(/energetic|pumped|excited|ready|adventure/)) {
energyLevel = “high”;
}

// Mood detection
let mood: VoicePreferences[“mood”] = “fun”;
if (lowerTranscript.match(/romantic|date|special|intimate/)) mood = “romantic”;
if (lowerTranscript.match(/fun|party|celebrate/)) mood = “fun”;
if (lowerTranscript.match(/adventure|explore|new|different/)) mood = “adventurous”;
if (lowerTranscript.match(/chill|relax|easy|casual/)) mood = “chill”;
if (lowerTranscript.match(/birthday|anniversary|celebration|special/)) mood = “celebratory”;

// Cuisine detection
const cuisines = [“Italian”, “Mexican”, “Japanese”, “Chinese”, “Thai”, “American”, “Indian”, “French”, “Mediterranean”];
const cuisinePreferences = cuisines.filter(c => lowerTranscript.includes(c.toLowerCase()));

// Activity detection
const activityMap: Record<string, string> = {
“music”: “live_music”,
“concert”: “live_music”,
“comedy”: “comedy”,
“movie”: “movies”,
“film”: “movies”,
“bowling”: “bowling”,
“arcade”: “arcade”,
“museum”: “museum”,
“escape room”: “escape_room”,
“mini golf”: “mini_golf”,
“golf”: “mini_golf”,
“hike”: “hike”,
“hiking”: “hike”,
“wine”: “wine”,
“wine bar”: “wine”
};

const activityPreferences: string[] = [];
Object.entries(activityMap).forEach(([keyword, activity]) => {
if (lowerTranscript.includes(keyword)) {
activityPreferences.push(activity);
}
});

return {
energyLevel,
mood,
cuisinePreferences,
activityPreferences,
constraints: [],
rawTranscript: transcript,
};
}
