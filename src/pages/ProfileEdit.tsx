import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { User, MapPin, Camera, Mic, Save, Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { NoveltyPreferenceSetting } from "@/components/NoveltyPreferenceSetting";

export default function ProfileEdit() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [voiceProfileData, setVoiceProfileData] = useState<{
    cuisines: string[];
    activities: string[];
    energyLevel: string;
    budget: string;
    transcript: string;
  } | null>(null);

  // Voice input hook
  const { isListening, isProcessing, startListening } = useVoiceInput({
    onPreferencesExtracted: (prefs) => {
      setVoiceProfileData({
        cuisines: prefs.cuisinePreferences || [],
        activities: prefs.activityPreferences || [],
        energyLevel: prefs.energyLevel || "moderate",
        budget: prefs.constraints?.[0] || "moderate",
        transcript: prefs.rawTranscript,
      });

      toast({
        title: "Preferences updated! 🎉",
        description: "Your voice preferences have been saved",
      });
    },
    userProfile: { home_zip: zipCode },
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error } = await supabase.functions.invoke('profile', {
        method: 'GET',
      });

      if (error) throw error;

      if (data) {
        setName(data.nickname || "");
        setZipCode(data.home_zip || "");
        setProfilePicture(data.profile_picture_url || "");
        
        if (data.voice_notes) {
          setVoiceProfileData({
            cuisines: data.cuisines || [],
            activities: data.activities || [],
            energyLevel: data.energy_level || "moderate",
            budget: data.price_range || "moderate",
            transcript: data.voice_notes,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error loading profile",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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

  const handleVoiceUpdate = async () => {
    startListening();
  };

  const handleSave = async () => {
    if (!name.trim() || !zipCode.trim() || zipCode.length !== 5) {
      toast({
        title: "Invalid input",
        description: "Please provide a valid name and ZIP code",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const profileData = {
        nickname: name.trim(),
        home_zip: zipCode.trim(),
        profile_picture_url: profilePicture || null,
        voice_notes: voiceProfileData?.transcript || null,
        cuisines: voiceProfileData?.cuisines || [],
        activities: voiceProfileData?.activities || [],
        energy_level: voiceProfileData?.energyLevel || null,
        price_range: voiceProfileData?.budget || null,
        default_radius_mi: 5,
      };

      const { error } = await supabase.functions.invoke('profile', {
        method: 'POST',
        body: profileData,
      });

      if (error) throw error;

      toast({
        title: "Profile saved! ✨",
        description: "Your changes have been updated",
      });

      navigate('/profile');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error saving profile",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            onClick={() => navigate('/profile')}
            variant="ghost"
            size="sm"
            className="text-purple-300 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-white">Edit Profile</h1>
        </div>

        {/* Basic Info Card */}
        <Card className="bg-slate-800/50 backdrop-blur-lg border-purple-500/20 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">Basic Information</h2>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-white">Name</Label>
              <Input
                id="edit-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>

            {/* ZIP Code */}
            <div className="space-y-2">
              <Label htmlFor="edit-zip" className="text-white">ZIP Code</Label>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-purple-400" />
                <Input
                  id="edit-zip"
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  maxLength={5}
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Profile Picture Card */}
        <Card className="bg-slate-800/50 backdrop-blur-lg border-purple-500/20 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Camera className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">Profile Picture</h2>
          </div>

          <div className="flex items-center gap-6">
            {profilePicture ? (
              <img
                src={profilePicture}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-4 border-purple-500"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center border-2 border-dashed border-slate-600">
                <Camera className="h-8 w-8 text-slate-500" />
              </div>
            )}

            <div className="flex-1 space-y-2">
              <label htmlFor="photo-edit" className="cursor-pointer">
                <Button variant="outline" className="w-full" asChild>
                  <span>
                    <Camera className="mr-2 h-4 w-4" />
                    {profilePicture ? "Change Photo" : "Upload Photo"}
                  </span>
                </Button>
                <input
                  id="photo-edit"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
              {profilePicture && (
                <Button
                  variant="ghost"
                  onClick={() => setProfilePicture("")}
                  className="w-full text-sm text-slate-400"
                >
                  Remove Photo
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Discovery Style Card */}
        <Card className="bg-slate-800/50 backdrop-blur-lg border-purple-500/20 p-6 space-y-6">
          <NoveltyPreferenceSetting />
        </Card>

        {/* Voice Preferences Card */}
        <Card className="bg-slate-800/50 backdrop-blur-lg border-purple-500/20 p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Mic className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">Date Night Preferences</h2>
          </div>

          {voiceProfileData ? (
            <div className="space-y-4">
              <div className="bg-slate-700/50 rounded-lg p-4 border border-purple-500/20">
                <p className="text-sm text-slate-300 italic">"{voiceProfileData.transcript}"</p>
              </div>
              <Button
                onClick={handleVoiceUpdate}
                disabled={isListening || isProcessing}
                variant="outline"
                className="w-full"
              >
                {isListening ? (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    >
                      <Mic className="mr-2 h-4 w-4" />
                    </motion.div>
                    Listening...
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    Update Preferences
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Tell us about your ideal date night style for better recommendations
              </p>
              <Button
                onClick={handleVoiceUpdate}
                disabled={isListening || isProcessing}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {isListening ? (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    >
                      <Mic className="mr-2 h-5 w-5" />
                    </motion.div>
                    Listening...
                  </>
                ) : isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-5 w-5" />
                    Add Voice Preferences 🎤
                  </>
                )}
              </Button>
            </div>
          )}
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-6 text-lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-5 w-5" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
