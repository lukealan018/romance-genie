import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Clock, Calendar, Cloud, ExternalLink, Heart, HelpCircle, Edit3, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface SharePlanData {
  shareId: string;
  shareContext: string;
  senderName: string;
  message: string;
  scheduledDate: string;
  scheduledTime: string;
  restaurant: {
    name: string;
    address: string;
    website?: string;
  };
  activity: {
    name: string;
    address: string;
    website?: string;
  };
  weather?: {
    temp?: number;
    description?: string;
    icon?: string;
  };
  responses: {
    in: number;
    maybe: number;
    tweak: number;
  };
  isExpired: boolean;
}

type ResponseType = 'in' | 'maybe' | 'tweak';
type TweakType = 'time' | 'vibe' | 'day';

export default function SharePlanPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [planData, setPlanData] = useState<SharePlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responded, setResponded] = useState(false);
  const [responding, setResponding] = useState(false);
  const [showTweakModal, setShowTweakModal] = useState(false);
  const [responderName, setResponderName] = useState('');
  const [tweakType, setTweakType] = useState<TweakType>('time');
  const [tweakNote, setTweakNote] = useState('');

  useEffect(() => {
    if (shareId) {
      fetchSharePlan();
    }
  }, [shareId]);

  const fetchSharePlan = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-share-plan', {
        body: { shareId },
      });

      if (error) throw error;
      setPlanData(data);
    } catch (err) {
      console.error('Error fetching share plan:', err);
      setError('This share link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (response: ResponseType) => {
    if (response === 'tweak') {
      setShowTweakModal(true);
      return;
    }

    await submitResponse(response);
  };

  const submitResponse = async (response: ResponseType, tweakData?: { type: TweakType; note: string }) => {
    setResponding(true);
    try {
      const { error } = await supabase.functions.invoke('respond-to-share', {
        body: {
          shareId,
          response,
          responderName: responderName || undefined,
          tweakType: tweakData?.type,
          tweakNote: tweakData?.note,
        },
      });

      if (error) throw error;
      setResponded(true);
      setShowTweakModal(false);
    } catch (err) {
      console.error('Error submitting response:', err);
    } finally {
      setResponding(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getContextTitle = (context: string, senderName: string) => {
    switch (context) {
      case 'date': return `${senderName} planned something special for you 💫`;
      case 'friends': return `${senderName} planned something fun 👀`;
      case 'group': return `${senderName} made a plan for the group 🎉`;
      default: return `${senderName} planned something for you ✨`;
    }
  };

  const getPrimaryButtonText = (context: string) => {
    switch (context) {
      case 'date': return "❤️ I'm in";
      case 'friends': return "👍 I'm down";
      case 'group': return "🙌 Count me in";
      default: return "✅ I'm in";
    }
  };

  const getTertiaryButtonText = (context: string) => {
    switch (context) {
      case 'date': return "✨ Let's tweak it";
      case 'friends': return "🔄 Let's tweak it";
      case 'group': return "💬 Adjust plan";
      default: return "🔄 Let's tweak it";
    }
  };

  const getTweakChipLabel = (type: TweakType) => {
    switch (type) {
      case 'time': return 'Different time';
      case 'vibe': return 'Different vibe';
      case 'day': return 'Different day';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (error || !planData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="text-6xl mb-4">💔</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Oops!</h1>
          <p className="text-muted-foreground">{error || 'Something went wrong.'}</p>
        </motion.div>
      </div>
    );
  }

  if (planData.isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="text-6xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Link Expired</h1>
          <p className="text-muted-foreground">This share link has expired. Ask them to send a new one!</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background/95 p-4 pb-32">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg mx-auto pt-8"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-primary text-sm font-medium mb-4"
          >
            <Sparkles className="w-4 h-4" />
            Andate
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            {getContextTitle(planData.shareContext, planData.senderName)}
          </h1>
          {planData.message && (
            <p className="text-muted-foreground italic text-lg">"{planData.message}"</p>
          )}
        </div>

        {/* Date & Time Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 mb-4"
        >
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">Date</span>
              </div>
              <p className="text-lg font-semibold text-foreground">
                {formatDate(planData.scheduledDate)}
              </p>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Time</span>
              </div>
              <p className="text-lg font-semibold text-foreground">
                {formatTime(planData.scheduledTime)}
              </p>
            </div>
          </div>
          {planData.weather && planData.weather.temp && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border/30">
              <Cloud className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {planData.weather.temp}°F • {planData.weather.description}
              </span>
            </div>
          )}
        </motion.div>

        {/* Restaurant Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 mb-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <span className="text-xs font-medium text-primary uppercase tracking-wider">Dinner</span>
              <h3 className="text-xl font-bold text-foreground mt-1">{planData.restaurant.name}</h3>
              <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{planData.restaurant.address}</span>
              </div>
            </div>
            {planData.restaurant.website && (
              <a
                href={planData.restaurant.website}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </motion.div>

        {/* Activity Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 mb-8"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <span className="text-xs font-medium text-primary uppercase tracking-wider">Activity</span>
              <h3 className="text-xl font-bold text-foreground mt-1">{planData.activity.name}</h3>
              <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{planData.activity.address}</span>
              </div>
            </div>
            {planData.activity.website && (
              <a
                href={planData.activity.website}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </motion.div>

        {/* Response Section */}
        <AnimatePresence mode="wait">
          {responded ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.1 }}
                className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/20 flex items-center justify-center"
              >
                <Check className="w-10 h-10 text-primary" />
              </motion.div>
              <h2 className="text-xl font-bold text-foreground mb-2">Response Sent!</h2>
              <p className="text-muted-foreground">They'll be notified 💕</p>
            </motion.div>
          ) : (
            <motion.div
              key="respond"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="space-y-4"
            >
              {/* Optional Name Input */}
              <div className="mb-6">
                <Input
                  placeholder="Your name (optional)"
                  value={responderName}
                  onChange={(e) => setResponderName(e.target.value)}
                  className="bg-card/50 border-border/50 text-center"
                />
              </div>

              {/* Response Buttons */}
              <div className="space-y-3">
                {/* Primary Button */}
                <Button
                  onClick={() => handleResponse('in')}
                  disabled={responding}
                  className="w-full h-14 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
                >
                  {getPrimaryButtonText(planData.shareContext)}
                </Button>

                {/* Secondary & Tertiary Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleResponse('maybe')}
                    disabled={responding}
                    variant="outline"
                    className="h-12 bg-muted/50 hover:bg-muted text-muted-foreground border-border/50"
                  >
                    🤔 Maybe
                  </Button>
                  <Button
                    onClick={() => handleResponse('tweak')}
                    disabled={responding}
                    variant="outline"
                    className="h-12 bg-muted/50 hover:bg-muted text-muted-foreground border-border/50"
                  >
                    {getTertiaryButtonText(planData.shareContext)}
                  </Button>
                </div>
              </div>

              {/* Response counts */}
              {(planData.responses.in > 0 || planData.responses.maybe > 0) && (
                <div className="text-center text-sm text-muted-foreground pt-4">
                  {planData.responses.in > 0 && (
                    <span className="mr-3">{planData.responses.in} in</span>
                  )}
                  {planData.responses.maybe > 0 && (
                    <span>{planData.responses.maybe} maybe</span>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tweak Modal */}
        <AnimatePresence>
          {showTweakModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center p-4"
              onClick={() => setShowTweakModal(false)}
            >
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-card border border-border rounded-t-3xl p-6 pb-8"
              >
                <h3 className="text-xl font-bold text-foreground mb-4">Suggest a Change</h3>
                
                {/* Tweak Type Chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(['time', 'day', 'vibe'] as TweakType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setTweakType(type)}
                      className={cn(
                        "px-4 py-2.5 rounded-full text-sm font-medium transition-all",
                        tweakType === type
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                          : "bg-muted/80 text-muted-foreground hover:bg-muted border border-border/50"
                      )}
                    >
                      {getTweakChipLabel(type)}
                    </button>
                  ))}
                </div>

                <Textarea
                  placeholder="What would work better? (e.g., 'Can we do 8pm instead?')"
                  value={tweakNote}
                  onChange={(e) => setTweakNote(e.target.value)}
                  className="mb-4 min-h-[100px] bg-background"
                />

                <Button
                  onClick={() => submitResponse('tweak', { type: tweakType, note: tweakNote })}
                  disabled={responding || !tweakNote.trim()}
                  className="w-full"
                >
                  {responding ? 'Sending...' : 'Send Suggestion'}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent"
        >
          <div className="max-w-lg mx-auto text-center">
            <a
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              Plan your own night with Andate
            </a>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
