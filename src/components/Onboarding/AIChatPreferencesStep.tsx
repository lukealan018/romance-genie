import { useState, useRef, useEffect } from "react";
import { Mic, Send, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OnboardingData } from "@/pages/Onboarding";
import { toast } from "sonner";

interface AIChatPreferencesStepProps {
  data: OnboardingData;
  onUpdate: (data: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

interface Message {
  type: 'ai' | 'user';
  text: string;
  subtext?: string;
}

const questions = [
  {
    id: 1,
    text: "When you're hungry, what's your go-to?",
    subtext: "(Pizza and wine? Sushi and sake? Burgers and beer? Tell me your favorites!)",
    field: "cuisines" as const
  },
  {
    id: 2,
    text: "Ok awesome, What do you typically spend on a night out?",
    subtext: "(So I can zero in on the perfect spot that fits your vibe)",
    field: "price_range" as const
  },
  {
    id: 3,
    text: "What kind of nights do you live for — live music, comedy, chill bars, or something totally random?",
    subtext: "(Tell me what gets you excited!)",
    field: "activities" as const
  },
  {
    id: 4,
    text: "Got any food rules or preferences?",
    subtext: "(Vegan, gluten-free, dairy-free, or \"I eat everything, bring it on!\")",
    field: "dietary" as const
  },
  {
    id: 5,
    text: "Anything you'd rather skip?",
    subtext: "(A dish, a scene, or maybe that one cuisine you just couldn't stand)",
    field: "dislikes" as const
  },
  {
    id: 6,
    text: "Who are you usually out with?",
    subtext: "(Date night? Just me, myself & I? Or friends that turn every night into a story?)",
    field: "party_size" as const
  },
  {
    id: 7,
    text: "What kind of vibe are you usually going for on a night out?",
    subtext: "(Romantic? Chill? Turn up? Give me the vibe!)",
    field: "vibe" as const
  },
  {
    id: 8,
    text: "Are you the type who books a table a week ahead… or just sees where the night takes you?",
    subtext: "(Planner or spontaneous? No judgment!)",
    field: "planning_style" as const
  },
];

const AIChatPreferencesStep = ({ data, onUpdate, onNext, onBack }: AIChatPreferencesStepProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'ai',
      text: "Let's make this fun! I'll ask you a few quick questions to personalize your experience. 🎉"
    },
    {
      type: 'ai',
      text: questions[0].text,
      subtext: questions[0].subtext
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check for Web Speech API support
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setVoiceSupported(true);
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          toast.error("Microphone access denied. Please enable it in your browser settings.");
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const extractProfileData = (response: string, field: typeof questions[number]['field']): string[] => {
    const lowerResponse = response.toLowerCase();

    switch (field) {
      case 'cuisines': {
        const cuisineMap: Record<string, string[]> = {
          'italian': ['italian', 'pizza', 'pasta'],
          'mexican': ['mexican', 'tacos', 'burrito'],
          'japanese': ['japanese', 'sushi', 'ramen'],
          'thai': ['thai', 'pad thai'],
          'chinese': ['chinese', 'dim sum'],
          'steakhouse': ['steak', 'steakhouse', 'bbq', 'barbecue'],
          'vegan': ['vegan', 'plant based'],
          'burgers': ['burger', 'burgers'],
          'seafood': ['seafood', 'fish'],
        };
        
        const found = new Set<string>();
        Object.entries(cuisineMap).forEach(([cuisine, keywords]) => {
          if (keywords.some(keyword => lowerResponse.includes(keyword))) {
            found.add(cuisine);
          }
        });
        
        return Array.from(found);
      }

      case 'activities': {
        const activityMap: Record<string, string[]> = {
          'comedy': ['comedy', 'stand up', 'comedian'],
          'live_music': ['live music', 'concert', 'band', 'music'],
          'movies': ['movie', 'cinema', 'film'],
          'bowling': ['bowling', 'bowl'],
          'arcade': ['arcade', 'games', 'gaming'],
          'museum': ['museum', 'art', 'gallery'],
          'escape_room': ['escape room', 'escape'],
          'mini_golf': ['mini golf', 'minigolf', 'putt putt'],
          'hike': ['hike', 'hiking', 'trail', 'nature'],
          'wine': ['wine', 'wine bar', 'wine tasting'],
          'bars': ['bar', 'bars', 'chill bar', 'pub', 'tavern'],
        };
        
        const found = new Set<string>();
        Object.entries(activityMap).forEach(([activity, keywords]) => {
          if (keywords.some(keyword => lowerResponse.includes(keyword))) {
            found.add(activity);
          }
        });
        
        return Array.from(found);
      }

      case 'price_range': {
        if (lowerResponse.includes('cheap') || lowerResponse.includes('budget') || 
            (lowerResponse.includes('$') && !lowerResponse.includes('$$'))) {
          return ['$'];
        } else if (lowerResponse.includes('$$$$') || lowerResponse.includes('expensive') || 
                   lowerResponse.includes('fancy') || lowerResponse.includes('upscale')) {
          return ['$$$$'];
        } else if (lowerResponse.includes('$$$') || lowerResponse.includes('nice') || 
                   lowerResponse.includes('splurge')) {
          return ['$$$'];
        } else if (lowerResponse.includes('$$') || lowerResponse.includes('moderate') || 
                   lowerResponse.includes('mid') || lowerResponse.includes('average')) {
          return ['$$'];
        }
        
        const rangeMatch = lowerResponse.match(/(\d+)[-to]\s*(\d+)/);
        if (rangeMatch) {
          const avg = (parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2;
          if (avg < 20) return ['$'];
          if (avg < 40) return ['$$'];
          if (avg < 70) return ['$$$'];
          return ['$$$$'];
        }
        return ['$$'];
      }

      case 'dislikes': {
        if (lowerResponse.includes('none') || lowerResponse.includes('nothing') || 
            lowerResponse.includes('everything') || lowerResponse.includes("don't skip")) {
          return [];
        }
        
        const dislikeMap: Record<string, string[]> = {
          'italian': ['italian', 'pizza', 'pasta'],
          'mexican': ['mexican', 'tacos'],
          'japanese': ['japanese', 'sushi'],
          'indian': ['indian', 'curry'],
          'seafood': ['seafood', 'fish'],
          'loud': ['loud', 'noisy', 'crowded'],
          'quiet': ['quiet', 'boring'],
          'clubs': ['club', 'clubs', 'nightclub'],
          'fancy': ['fancy', 'formal', 'dress up'],
        };
        
        const found = new Set<string>();
        Object.entries(dislikeMap).forEach(([dislike, keywords]) => {
          if (keywords.some(keyword => lowerResponse.includes(keyword))) {
            found.add(dislike);
          }
        });
        
        return Array.from(found);
      }

      case 'party_size': {
        const numbers = lowerResponse.match(/\d+/);
        if (numbers) {
          return [numbers[0]];
        }
        
        if (lowerResponse.includes('solo') || lowerResponse.includes('alone') || 
            lowerResponse.includes('myself') || lowerResponse.includes('just me')) {
          return ['1'];
        }
        if (lowerResponse.includes('date') || lowerResponse.includes('couple') || 
            lowerResponse.includes('two') || lowerResponse.includes('partner')) {
          return ['2'];
        }
        if (lowerResponse.includes('group') || lowerResponse.includes('friends') || 
            lowerResponse.includes('crew')) {
          return ['4'];
        }
        
        return ['2'];
      }

      case 'vibe': {
        const vibeMap: Record<string, string[]> = {
          'romantic': ['romantic', 'date', 'intimate', 'cozy'],
          'casual': ['casual', 'chill', 'relaxed', 'laid back', 'easygoing'],
          'upscale': ['upscale', 'fancy', 'classy', 'elegant', 'sophisticated'],
          'lively': ['lively', 'energetic', 'turn up', 'party', 'fun'],
          'quiet': ['quiet', 'peaceful', 'calm', 'mellow'],
        };
        
        for (const [vibe, keywords] of Object.entries(vibeMap)) {
          if (keywords.some(keyword => lowerResponse.includes(keyword))) {
            return [vibe];
          }
        }
        
        return ['casual'];
      }

      case 'planning_style': {
        if (lowerResponse.includes('plan') || lowerResponse.includes('ahead') || 
            lowerResponse.includes('book') || lowerResponse.includes('reserve') || 
            lowerResponse.includes('week')) {
          return ['planner'];
        } else if (lowerResponse.includes('spontaneous') || lowerResponse.includes('random') || 
                   lowerResponse.includes('see where') || lowerResponse.includes('go with') || 
                   lowerResponse.includes('wing it')) {
          return ['spontaneous'];
        } else if (lowerResponse.includes('flexible') || lowerResponse.includes('both') || 
                   lowerResponse.includes('depends')) {
          return ['flexible'];
        }
        return ['flexible'];
      }

      case 'dietary': {
        if (lowerResponse.includes('none') || lowerResponse.includes('everything') || lowerResponse.includes('no restriction')) {
          return [];
        }
        
        const dietaryMap: Record<string, string[]> = {
          'gluten_free': ['gluten free', 'gluten-free', 'celiac'],
          'vegetarian': ['vegetarian', 'veggie'],
          'vegan': ['vegan'],
          'halal': ['halal'],
          'kosher': ['kosher'],
        };
        
        const found = new Set<string>();
        Object.entries(dietaryMap).forEach(([dietary, keywords]) => {
          if (keywords.some(keyword => lowerResponse.includes(keyword))) {
            found.add(dietary);
          }
        });
        
        return Array.from(found);
      }

      default:
        return [];
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        setIsListening(true);
        recognitionRef.current.start();
      } catch (error) {
        console.error('Failed to start voice recognition:', error);
        setIsListening(false);
        toast.error("Voice input failed. Please type your answer instead.");
      }
    }
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { type: 'user', text: userInput }]);

    const currentQ = questions[currentQuestion];
    const extractedData = extractProfileData(userInput, currentQ.field);

    // Update the data with proper type conversion
    let updateData: Partial<OnboardingData>;

    if (currentQ.field === 'party_size') {
      updateData = {
        party_size: parseInt(extractedData[0]) || 2
      };
    } else if (currentQ.field === 'price_range' || currentQ.field === 'vibe' || 
               currentQ.field === 'planning_style') {
      updateData = {
        [currentQ.field]: extractedData[0] || undefined
      };
    } else {
      updateData = {
        [currentQ.field]: extractedData
      };
    }

    onUpdate(updateData);
    setUserInput('');

    // Show confirmation and move to next question or complete
    setTimeout(() => {
      if (currentQ.field === 'party_size') {
        const size = parseInt(extractedData[0]);
        setMessages(prev => [...prev, {
          type: 'ai',
          text: `Got it! Party of ${size}.${currentQuestion === questions.length - 1 ? " Perfect!" : ""}`
        }]);
      } else if (currentQ.field === 'price_range' || currentQ.field === 'vibe' || 
                 currentQ.field === 'planning_style') {
        setMessages(prev => [...prev, {
          type: 'ai',
          text: `Got it! ${extractedData[0]}.${currentQuestion === questions.length - 1 ? " Perfect!" : ""}`
        }]);
      } else if (extractedData.length > 0) {
        setMessages(prev => [...prev, {
          type: 'ai',
          text: `Got it! ${extractedData.map(item => item.replace(/_/g, ' ')).join(', ')}.${currentQuestion === questions.length - 1 ? " Perfect!" : ""}`
        }]);
      } else if (currentQ.field === 'dietary' || currentQ.field === 'dislikes') {
        setMessages(prev => [...prev, {
          type: 'ai',
          text: "No worries! All set then."
        }]);
      } else {
        setMessages(prev => [...prev, {
          type: 'ai',
          text: `I didn't catch any ${currentQ.field === 'cuisines' ? 'cuisines' : 'activities'}. Could you tell me again? ${currentQ.subtext}`
        }]);
        return;
      }

      setTimeout(() => {
        if (currentQuestion < questions.length - 1) {
          const nextQ = questions[currentQuestion + 1];
          setMessages(prev => [...prev, {
            type: 'ai',
            text: nextQ.text,
            subtext: nextQ.subtext
          }]);
          setCurrentQuestion(currentQuestion + 1);
        } else {
          // Validate before completing
          if (data.cuisines.length === 0) {
            setMessages(prev => [...prev, {
              type: 'ai',
              text: "Oops! I need at least one cuisine preference. What type of food do you like?"
            }]);
            setCurrentQuestion(0);
            return;
          }
          if (data.activities.length === 0) {
            setMessages(prev => [...prev, {
              type: 'ai',
              text: "Oops! I need at least one activity preference. What do you like to do?"
            }]);
            setCurrentQuestion(2);
            return;
          }
          
          setMessages(prev => [...prev, {
            type: 'ai',
            text: "🎉 Perfect! Your preferences are all set. Ready to discover amazing nights out!"
          }]);
          setIsComplete(true);
        }
      }, 800);
    }, 600);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="border-2 flex flex-col h-[600px]">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl">AI Preference Builder</CardTitle>
            <CardDescription>
              Question {currentQuestion + 1} of {questions.length}
            </CardDescription>
          </div>
        </div>
        <div className="mt-3 bg-muted rounded-full h-2 overflow-hidden">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-500"
            style={{width: `${((currentQuestion + 1) / questions.length) * 100}%`}}
          />
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-4 ${
              msg.type === 'user' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted'
            }`}>
              <p className="text-sm">{msg.text}</p>
              {msg.subtext && (
                <p className="text-xs mt-2 opacity-75">{msg.subtext}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </CardContent>

      {!isComplete ? (
        <div className="border-t p-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your answer..."
              className="flex-1 px-4 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              disabled={isListening}
            />
            
            {voiceSupported && (
              <Button
                type="button"
                onClick={startListening}
                disabled={isListening}
                variant="outline"
                size="icon"
                className={isListening ? 'animate-pulse bg-destructive text-destructive-foreground' : ''}
              >
                <Mic className="w-4 h-4" />
              </Button>
            )}
            
            <Button
              type="button"
              onClick={handleSendMessage}
              disabled={!userInput.trim()}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={onBack} variant="outline" className="w-full">
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="border-t p-4">
          <Button onClick={onNext} className="w-full" size="lg">
            Continue
          </Button>
        </div>
      )}
    </Card>
  );
};

export default AIChatPreferencesStep;
