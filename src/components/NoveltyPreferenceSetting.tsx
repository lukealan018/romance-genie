import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles } from 'lucide-react';
import { useToast } from './ui/use-toast';

export type NoveltyMode = 'popular' | 'balanced' | 'hidden_gems';

export const NoveltyPreferenceSetting = () => {
  const { toast } = useToast();
  const [preference, setPreference] = useState<NoveltyMode>('balanced');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPreference();
  }, []);

  const fetchPreference = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('novelty_preference')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data?.novelty_preference) {
        setPreference(data.novelty_preference as NoveltyMode);
      }
    } catch (error) {
      console.error('Error fetching novelty preference:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = async (newPref: NoveltyMode) => {
    setPreference(newPref);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ novelty_preference: newPref })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Preference updated! ✨',
        description: 'Your discovery style has been saved',
      });
    } catch (error) {
      console.error('Error updating novelty preference:', error);
      toast({
        title: 'Error updating preference',
        description: 'Please try again',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Discovery Style</h2>
          <p className="text-sm text-slate-400">
            How adventurous are you when finding new spots?
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => updatePreference('popular')}
          className={`w-full p-4 rounded-xl text-left transition-all border-2 ${
            preference === 'popular'
              ? 'bg-blue-600/20 border-blue-500 text-white'
              : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
          }`}
        >
          <div className="font-semibold">Popular Spots</div>
          <div className="text-sm opacity-80">
            Show me well-known, highly-rated places
          </div>
        </button>

        <button
          onClick={() => updatePreference('balanced')}
          className={`w-full p-4 rounded-xl text-left transition-all border-2 ${
            preference === 'balanced'
              ? 'bg-purple-600/20 border-purple-500 text-white'
              : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
          }`}
        >
          <div className="font-semibold">Balanced Mix</div>
          <div className="text-sm opacity-80">
            Mix of popular spots and hidden gems
          </div>
        </button>

        <button
          onClick={() => updatePreference('hidden_gems')}
          className={`w-full p-4 rounded-xl text-left transition-all border-2 ${
            preference === 'hidden_gems'
              ? 'bg-orange-600/20 border-orange-500 text-white'
              : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600'
          }`}
        >
          <div className="font-semibold">Hidden Gems 💎</div>
          <div className="text-sm opacity-80">
            Show me unique, lesser-known local favorites
          </div>
        </button>
      </div>
    </div>
  );
};
