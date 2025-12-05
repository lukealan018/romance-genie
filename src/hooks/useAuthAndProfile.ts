import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { usePlanStore } from "@/store/planStore";
import { isDevModeActive, getDevUserId, getMockProfile, logDevMode } from "@/lib/dev-utils";

// Map profile experience_level to search priceLevel values
const experienceToPriceLevel: Record<string, string> = {
  any: '',
  casual: 'budget',
  nice: 'moderate',
  upscale: 'upscale',
  luxury: 'fine_dining',
};

interface ProfileData {
  profile_picture_url?: string;
  voice_notes?: string;
}

export const useAuthAndProfile = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>("");
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);
  const [profileData, setProfileData] = useState<ProfileData>({});
  const locationSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { setLocation, setFilters, setUserPreferences } = usePlanStore();

  // Check authentication and onboarding
  useEffect(() => {
    const checkAuth = async () => {
      if (isDevModeActive()) {
        const devId = getDevUserId();
        const mockProfile = getMockProfile();
        
        logDevMode('Setting dev user ID:', devId);
        setUserId(devId);
        setNickname(mockProfile.nickname || 'Dev User');
        setIsCheckingOnboarding(false);
        
        setUserPreferences({
          cuisines: mockProfile.cuisines,
          activities: mockProfile.activities
        });
        
        return;
      }

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;
        
        if (!session?.user) {
          navigate('/login');
          return;
        }

        setUserId(session.user.id);

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        }

        if (!profile) {
          navigate('/onboarding');
          return;
        }

        setNickname(profile.nickname || '');
        
        if (profile.home_zip) {
          try {
            const { data: geocodeData, error: geocodeError } = await supabase.functions.invoke('geocode', {
              body: { zipCode: profile.home_zip }
            });
            
            if (!geocodeError && geocodeData?.lat && geocodeData?.lng) {
              setLocation(geocodeData.lat, geocodeData.lng);
            }
          } catch (err) {
            console.error('Failed to geocode home ZIP:', err);
          }
        }

        setFilters({
          radius: profile.default_radius_mi || 5,
          zipCode: profile.home_zip || '',
          locationMode: profile.home_zip ? 'zip' : 'gps',
          priceLevel: experienceToPriceLevel[profile.experience_level] ?? ''
        });

        if (profile.cuisines || profile.activities) {
          setUserPreferences({
            cuisines: profile.cuisines || [],
            activities: profile.activities || []
          });
        }
      } catch (error) {
        console.error('Auth check error:', error);
        navigate('/login');
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    checkAuth();
  }, [navigate, setLocation, setFilters, setUserPreferences]);

  // Real-time notification listener
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const notification = payload.new as any;
          toast({
            title: notification.title,
            description: notification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Fetch profile data for completion prompt
  const fetchProfile = async () => {
    if (!userId) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('profile_picture_url, voice_notes')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      
      if (profile) {
        setProfileData({
          profile_picture_url: profile.profile_picture_url,
          voice_notes: profile.voice_notes,
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  // Save location settings with debounce
  const saveLocationSettings = async (radiusVal: number, zipCodeVal: string, immediate: boolean = false) => {
    if (!userId) return;
    
    const save = async () => {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            default_radius_mi: radiusVal,
            home_zip: zipCodeVal || null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (error) throw error;
        console.log('Location settings saved successfully');
      } catch (error) {
        console.error('Error saving location settings:', error);
      }
    };

    if (immediate) {
      await save();
    } else {
      if (locationSaveTimeoutRef.current) {
        clearTimeout(locationSaveTimeoutRef.current);
      }
      locationSaveTimeoutRef.current = setTimeout(save, 2000);
    }
  };

  return {
    userId,
    nickname,
    isCheckingOnboarding,
    profileData,
    fetchProfile,
    saveLocationSettings
  };
};
