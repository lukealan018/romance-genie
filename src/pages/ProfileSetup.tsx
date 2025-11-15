import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Send, MapPin, Sparkles, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// TypeScript declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message {
  type: string;
  text: string;
  subtext?: string;
  emoji?: string;
  isCelebration?: boolean;
}

const questions = [
  {
    id: 1,
    text: "When you're hungry, what's your go-to?",
    subtext: "(Pizza and wine? Sushi and sake? Burgers and beer? Tell me your favorites!)",
    field: "cuisinePreferences",
    emoji: "🍕"
  },
  {
    id: 2,
    text: "Ok awesome, What do you typically spend on a night out?",
    subtext: "(So I can zero in on the perfect spot that fits your vibe)",
    field: "priceRange",
    emoji: "💰"
  },
  {
    id: 3,
    text: "What kind of nights do you live for?",
    subtext: "(Live music, comedy shows, bars, or something totally random?)",
    field: "activityPreferences",
    emoji: "🎭"
  },
  {
    id: 4,
    text: "Got any food rules or preferences?",
    subtext: "(Vegan, gluten-free, dairy-free, or \"I eat everything, bring it on!\")",
    field: "foodRules",
    emoji: "🥗"
  },
  {
    id: 5,
    text: "Anything you'd rather skip?",
    subtext: "(A dish, a scene, or maybe that one cuisine you just couldn't stand)",
    field: "dealbreakers",
    emoji: "🚫"
  },
  {
    id: 6,
    text: "Who are you usually out with?",
    subtext: "(Date night? Just me, myself & I? Or friends that turn every night into a story?)",
    field: "occasionType",
    emoji: "💑"
  },
  {
    id: 7,
    text: "How do your nights usually kick off?",
    subtext: "(Brunch mimosas, golden-hour drinks, or late-night adventures?)",
    field: "timePreference",
    emoji: "⏰"
  },
  {
    id: 8,
    text: "Are you the type who books a table a week ahead… or just sees where the night takes you?",
    subtext: "",
    field: "planningStyle",
    emoji: "📅"
  }
];

const celebrationPhrases = [
  "Love it! ✨",
  "Perfect! 🎯",
  "Nice choice! 👌",
  "Got it! 🙌",
  "Awesome! 🔥",
  "Great taste! 💫"
];

export default function ProfileSetup() {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    { 
      type: 'ai', 
      text: "Hey! I'm here to build your perfect night out profile. This'll be fun and super quick! 🎉"
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [profile, setProfile] = useState({
    zipCode: '',
    maxDistance: 10,
    cuisinePreferences: [],
    priceRange: '',
    activityPreferences: [],
    foodRules: [],
    dealbreakers: [],
    occasionType: '',
    timePreference: '',
    planningStyle: ''
  });
  const [isListening, setIsListening] = useState(false);
  const [showLocationSetup, setShowLocationSetup] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/login");
        return;
      }
    };
    
    checkAuth();
  }, [navigate]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const extractProfileData = (response, field) => {
    const lowerResponse = response.toLowerCase();
    
    switch(field) {
      case 'cuisinePreferences':
        const cuisines = ['italian', 'mexican', 'chinese', 'japanese', 'sushi', 'thai', 'indian', 'american', 'pizza', 'burgers', 'bbq', 'seafood', 'steakhouse', 'mediterranean', 'french', 'korean', 'vietnamese'];
        return cuisines.filter(c => lowerResponse.includes(c));
      
      case 'priceRange':
        if (lowerResponse.match(/\$\$\$\$|expensive|splurge|treat.*myself|high.*end|100\+|150/)) return '$$$$';
        if (lowerResponse.match(/\$\$\$|nice|upscale|75|80|90/)) return '$$$';
        if (lowerResponse.match(/\$\$|moderate|mid.*range|50|60/)) return '$$';
        if (lowerResponse.match(/\$|cheap|budget|chill|30|40|affordable/)) return '$';
        return '$$';
      
      case 'activityPreferences':
        const activities = ['live music', 'comedy', 'bars', 'clubs', 'dancing', 'sports', 'theater', 'concerts', 'karaoke', 'trivia', 'games', 'arcade'];
        return activities.filter(a => lowerResponse.includes(a));
      
      case 'foodRules':
        const dietary = ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'kosher', 'halal', 'pescatarian', 'keto', 'paleo'];
        const found = dietary.filter(d => lowerResponse.includes(d));
        if (lowerResponse.includes('eat everything') || lowerResponse.includes('no restrictions')) {
          return ['no restrictions'];
        }
        return found;
      
      case 'dealbreakers':
        return [response];
      
      case 'occasionType':
        if (lowerResponse.includes('date') || lowerResponse.includes('romantic') || lowerResponse.includes('special')) return 'date';
        if (lowerResponse.includes('solo') || lowerResponse.includes('myself') || lowerResponse.includes('alone')) return 'solo';
        if (lowerResponse.includes('friend')) return 'friends';
        return 'any';
      
      case 'timePreference':
        if (lowerResponse.includes('brunch') || lowerResponse.includes('morning') || lowerResponse.includes('mimosa')) return 'brunch';
        if (lowerResponse.includes('golden hour') || lowerResponse.includes('sunset') || lowerResponse.includes('happy hour')) return 'golden-hour';
        if (lowerResponse.includes('late') || lowerResponse.includes('night') || lowerResponse.includes('after dark')) return 'late-night';
        return 'evening';
      
      case 'planningStyle':
        if (lowerResponse.includes('book') || lowerResponse.includes('plan') || lowerResponse.includes('ahead') || lowerResponse.includes('week')) return 'planner';
        if (lowerResponse.includes('spontaneous') || lowerResponse.includes('last minute') || lowerResponse.includes('see where')) return 'spontaneous';
        return 'flexible';
      
      default:
        return response;
    }
  };

  const handleStartChat = () => {
    if (!profile.zipCode) {
      toast.error("Oops! Please enter your zip code first!");
      return;
    }
    setShowLocationSetup(false);
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, {
        type: 'ai',
        text: questions[0].text,
        subtext: questions[0].subtext,
        emoji: questions[0].emoji
      }]);
      setIsTyping(false);
    }, 800);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    setMessages(prev => [...prev, { type: 'user', text: userInput }]);

    const currentQ = questions[currentQuestion];
    const extractedData = extractProfileData(userInput, currentQ.field);
    
    const newProfile = {
      ...profile,
      [currentQ.field]: extractedData
    };
    setProfile(newProfile);

    setUserInput('');

    const celebration = celebrationPhrases[Math.floor(Math.random() * celebrationPhrases.length)];
    setTimeout(() => {
      setMessages(prev => [...prev, {
        type: 'ai',
        text: celebration,
        isCelebration: true
      }]);
    }, 400);

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setIsTyping(true);
        setTimeout(() => {
          const nextQ = questions[currentQuestion + 1];
          setMessages(prev => [...prev, {
            type: 'ai',
            text: nextQ.text,
            subtext: nextQ.subtext,
            emoji: nextQ.emoji
          }]);
          setCurrentQuestion(currentQuestion + 1);
          setIsTyping(false);
        }, 1000);
      } else {
        setIsTyping(true);
        setTimeout(() => {
          setMessages(prev => [...prev, {
            type: 'ai',
            text: "🎉 Amazing! Your profile is complete and looking good!"
          }]);
          setIsTyping(false);
          setIsComplete(true);
          setShowConfetti(true);
        }, 1000);
      }
    }, 1200);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const saveProfileToSupabase = async () => {
    setIsSaving(true);
    
    try {
      // Get the current session to ensure auth.uid() works in RLS policies
      let { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // If no session, try to refresh it
      if (!session) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          throw new Error('You must be logged in to save your profile. Please try logging in again.');
        }
        session = refreshData.session;
      }
      
      if (!session?.user) {
        throw new Error('You must be logged in to save your profile');
      }
      
      const user = session.user;

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const profileData = {
        user_id: user.id,
        home_zip: profile.zipCode,
        default_radius_mi: profile.maxDistance,
        cuisines: profile.cuisinePreferences,
        activities: profile.activityPreferences,
        dietary: profile.foodRules.length > 0 ? profile.foodRules : null,
        dislikes: profile.dealbreakers.length > 0 ? profile.dealbreakers : null,
        occasion_type: profile.occasionType,
        time_preference: profile.timePreference,
        planning_style: profile.planningStyle,
        price_range: profile.priceRange
      };

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert(profileData);

        if (error) throw error;
      }

      // Mark onboarding as complete
      localStorage.setItem("hasOnboarded", "true");
      localStorage.setItem("showOnboardingCompleteToast", "true");
      
      toast.success("Success! 🎉 Your profile has been saved!");
      
      // Redirect to home page after short delay
      setTimeout(() => {
        navigate('/');
      }, 1500);

    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || "Failed to save profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  if (showLocationSetup) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 flex items-center justify-center">
        <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <MapPin className="w-16 h-16 mx-auto mb-4 text-indigo-400 animate-pulse" />
            <h2 className="text-3xl font-bold text-slate-100 mb-2">Where are you heading out?</h2>
            <p className="text-slate-400">Let's start with your location</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Zip Code
              </label>
              <input
                type="text"
                value={profile.zipCode}
                onChange={(e) => setProfile({...profile, zipCode: e.target.value})}
                placeholder="Enter zip code"
                className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 text-slate-100 placeholder-slate-400 rounded-lg focus:border-indigo-500 focus:outline-none text-lg transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                How far will you travel? <span className="text-indigo-400 font-semibold">{profile.maxDistance} miles</span>
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={profile.maxDistance}
                onChange={(e) => setProfile({...profile, maxDistance: parseInt(e.target.value)})}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1 mi</span>
                <span>30 mi</span>
              </div>
            </div>

            <button
              onClick={handleStartChat}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-lg font-semibold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg transform hover:scale-105"
            >
              Let's Build Your Profile! ✨
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-3xl mx-auto bg-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{height: '90vh'}}>
        
        {/* Header with Progress */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-8 h-8" />
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Building Your Perfect Night</h1>
              <p className="text-indigo-200 text-sm">{currentQuestion + 1} of {questions.length} questions</p>
            </div>
          </div>
          <div className="relative bg-white/20 rounded-full h-3 overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-700 ease-out"
              style={{width: `${progress}%`}}
            />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl p-4 ${
                msg.isCelebration
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white text-center text-xl font-bold animate-bounce'
                  : msg.type === 'user' 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' 
                    : 'bg-slate-700 text-slate-100'
              }`}>
                {msg.emoji && <span className="text-4xl block mb-2">{msg.emoji}</span>}
                <p className="text-lg">{msg.text}</p>
                {msg.subtext && (
                  <p className="text-sm mt-2 opacity-75">{msg.subtext}</p>
                )}
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-slate-700 rounded-2xl p-4">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {!isComplete && (
          <div className="border-t border-slate-700 bg-slate-800 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your answer..."
                className="flex-1 px-4 py-3 bg-slate-700 border-2 border-slate-600 text-slate-100 placeholder-slate-400 rounded-lg focus:border-indigo-500 focus:outline-none transition-all"
                disabled={isListening || isTyping}
              />
              
              {recognitionRef.current && (
                <button
                  onClick={startListening}
                  disabled={isListening || isTyping}
                  className={`p-3 rounded-lg transition-all ${
                    isListening 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  <Mic className="w-6 h-6" />
                </button>
              )}
              
              <button
                onClick={handleSendMessage}
                disabled={!userInput.trim() || isTyping}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}

        {/* Complete */}
        {isComplete && (
          <div className="border-t border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700 p-6 relative overflow-hidden">
            {showConfetti && (
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(50)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute text-2xl animate-ping"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `-20px`,
                      animationDelay: `${Math.random() * 2}s`,
                      animationDuration: '3s'
                    }}
                  >
                    {['🎉', '✨', '🎊', '💫', '🌟'][Math.floor(Math.random() * 5)]}
                  </div>
                ))}
              </div>
            )}
            <div className="text-center relative z-10">
              <CheckCircle2 className="w-20 h-20 mx-auto mb-4 text-green-400" />
              <h3 className="text-3xl font-bold text-slate-100 mb-2">You're All Set! 🎉</h3>
              <p className="text-slate-400 mb-6">Time to discover your perfect night out</p>
              <button
                onClick={saveProfileToSupabase}
                disabled={isSaving}
                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-green-600 hover:to-emerald-600 transition-all shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "Let's Find Tonight's Adventure! 🚀"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
