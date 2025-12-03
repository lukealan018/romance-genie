import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { ThemeSelector } from "@/components/ThemeSwitcher";

// Primary options shown directly on page
const PRIMARY_CUISINES = ["italian", "mexican", "sushi", "steakhouse", "thai", "american"];
const EXTENDED_CUISINES = ["japanese", "chinese", "indian", "korean", "mediterranean", "french", "vietnamese", "bbq", "seafood", "pizza", "greek", "spanish", "caribbean", "ethiopian", "peruvian"];

const PRIMARY_ACTIVITIES = ["movies", "live_music", "comedy", "mini_golf", "escape_room"];
const EXTENDED_ACTIVITIES = ["bowling", "arcade", "museum", "wine_tasting", "hiking", "karaoke", "spa", "art_gallery", "theater", "concert", "dancing", "trivia", "axe_throwing", "pottery"];

const PRIMARY_DIETARY = ["vegetarian", "vegan", "gluten_free"];
const RELIGIOUS_DIETARY = ["halal", "kosher"];

const RECOMMENDATION_STYLES = [
  { value: "popular", label: "Popular", description: "Well-known favorites" },
  { value: "balanced", label: "Balanced", description: "Mix of both" },
  { value: "hidden_gems", label: "Hidden Gems", description: "Unique local spots" },
];

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Core profile state
  const [nickname, setNickname] = useState("");
  const [homeZip, setHomeZip] = useState("");
  const [defaultRadius, setDefaultRadius] = useState(10);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [noveltyPreference, setNoveltyPreference] = useState("balanced");
  
  // Sheet states
  const [cuisineSheetOpen, setCuisineSheetOpen] = useState(false);
  const [activitySheetOpen, setActivitySheetOpen] = useState(false);
  const [religiousSheetOpen, setReligiousSheetOpen] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        navigate('/login');
        return;
      }
      setUserId(session.user.id);
    };
    initAuth();
  }, [navigate]);

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const response = await supabase.functions.invoke('profile', {
        method: 'GET',
      });

      if (response.error) {
        if (response.error.message?.includes('not found')) {
          toast({
            title: "No profile found",
            description: "Please complete onboarding first",
            variant: "destructive",
          });
          navigate("/onboarding");
          return;
        }
        throw new Error(response.error.message);
      }

      if (response.data) {
        const profile = response.data;
        setNickname(profile.nickname || "");
        setHomeZip(profile.home_zip || "");
        setDefaultRadius(profile.default_radius_mi ?? 10);
        setSelectedCuisines(profile.cuisines || []);
        setSelectedActivities(profile.activities || []);
        setSelectedDietary(profile.dietary || []);
        setNoveltyPreference(profile.novelty_preference || "balanced");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      toast({
        title: "Validation Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    if (!/^\d{5}$/.test(homeZip)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid 5-digit ZIP code",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await supabase.functions.invoke('profile', {
        method: 'POST',
        body: {
          nickname: nickname.trim(),
          home_zip: homeZip,
          default_radius_mi: defaultRadius,
          cuisines: selectedCuisines.length > 0 ? selectedCuisines : null,
          activities: selectedActivities.length > 0 ? selectedActivities : null,
          dietary: selectedDietary.length > 0 ? selectedDietary : null,
          novelty_preference: noveltyPreference,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to update profile");
      }

      if (response.data) {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
        localStorage.setItem("profileNeedsRefresh", "true");
        navigate("/");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = (item: string, list: string[], setter: (list: string[]) => void) => {
    if (list.includes(item)) {
      setter(list.filter((i) => i !== item));
    } else {
      setter([...list, item]);
    }
  };

  const formatLabel = (str: string) => str.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <button 
            onClick={() => navigate("/")} 
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-luxury-heading">Profile</h1>
        </div>
      </header>

      <main className="px-4 py-6 pb-32 max-w-lg mx-auto space-y-[18px]">
        {/* Card 1: Your Info */}
        <div className="card-luxury fade-slide-in">
          <h2 className="text-luxury-heading mb-6">Your Info</h2>

          <div className="space-y-5">
            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">Name</Label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your name"
                className="input-luxury"
                maxLength={50}
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground mb-2 block">Home ZIP Code</Label>
              <input
                type="text"
                value={homeZip}
                onChange={(e) => setHomeZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="12345"
                className="input-luxury"
                maxLength={5}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <Label className="text-sm font-medium text-foreground">Search Radius</Label>
                <span className="text-primary font-semibold">{defaultRadius} miles</span>
              </div>
              <Slider
                value={[defaultRadius]}
                onValueChange={(v) => setDefaultRadius(v[0])}
                min={3}
                max={25}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Card 2: Preferences */}
        <div className="card-luxury fade-slide-in" style={{ animationDelay: "0.05s" }}>
          <h2 className="text-luxury-heading mb-1">Preferences</h2>
          <p className="text-luxury-subtitle mb-6">Tailor your recommendations</p>

          {/* Cuisines */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-3 block">Favorite Cuisines</Label>
            <div className="flex flex-wrap gap-2">
              {PRIMARY_CUISINES.map((cuisine) => (
                <button
                  key={cuisine}
                  onClick={() => toggleItem(cuisine, selectedCuisines, setSelectedCuisines)}
                  className={`chip-luxury ${selectedCuisines.includes(cuisine) ? "selected" : ""}`}
                >
                  {formatLabel(cuisine)}
                </button>
              ))}
              <button
                onClick={() => setCuisineSheetOpen(true)}
                className="chip-luxury ml-auto flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                More
              </button>
            </div>
          </div>

          {/* Section Divider */}
          <div className="section-divider" />

          {/* Activities */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-3 block">Favorite Activities</Label>
            <div className="flex flex-wrap gap-2">
              {PRIMARY_ACTIVITIES.map((activity) => (
                <button
                  key={activity}
                  onClick={() => toggleItem(activity, selectedActivities, setSelectedActivities)}
                  className={`chip-luxury ${selectedActivities.includes(activity) ? "selected" : ""}`}
                >
                  {formatLabel(activity)}
                </button>
              ))}
              <button
                onClick={() => setActivitySheetOpen(true)}
                className="chip-luxury ml-auto flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                More
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Recommendation Style */}
        <div className="card-luxury fade-slide-in" style={{ animationDelay: "0.1s" }}>
          <h2 className="text-luxury-heading mb-6">Recommendation Style</h2>

          <div className="flex gap-2">
            {RECOMMENDATION_STYLES.map((style) => (
              <button
                key={style.value}
                onClick={() => setNoveltyPreference(style.value)}
                className={`rec-style-btn ${noveltyPreference === style.value ? "selected" : ""}`}
              >
                <span className="rec-label">{style.label}</span>
                <span className="rec-subtitle">{style.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Card 4: Dietary Needs */}
        <div className="card-luxury fade-slide-in" style={{ animationDelay: "0.15s" }}>
          <h2 className="text-luxury-heading mb-1">Dietary Needs</h2>
          <p className="text-luxury-subtitle mb-6">Optional dietary filters</p>

          <div className="flex flex-wrap gap-2">
            {PRIMARY_DIETARY.map((item) => (
              <button
                key={item}
                onClick={() => toggleItem(item, selectedDietary, setSelectedDietary)}
                className={`chip-luxury ${selectedDietary.includes(item) ? "selected" : ""}`}
              >
                {formatLabel(item)}
              </button>
            ))}
            <button
              onClick={() => setReligiousSheetOpen(true)}
              className="chip-luxury"
            >
              Religious
            </button>
          </div>
        </div>

        {/* Card 5: Theme / Appearance */}
        <div className="card-luxury fade-slide-in" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-luxury-heading mb-1">Appearance</h2>
          <p className="text-luxury-subtitle mb-6">Choose your visual theme</p>
          <ThemeSelector />
        </div>
      </main>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-sm border-t border-border">
        <div className="max-w-lg mx-auto flex gap-3">
          <button onClick={() => navigate(-1)} className="btn-luxury-secondary flex-1">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-luxury-primary flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </button>
        </div>
      </div>

      {/* Cuisine Sheet */}
      <Sheet open={cuisineSheetOpen} onOpenChange={setCuisineSheetOpen}>
        <SheetContent side="bottom" className="bg-card border-border rounded-t-[18px]">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-luxury-heading">More Cuisines</SheetTitle>
          </SheetHeader>
          <div className="flex flex-wrap gap-2 pb-8">
            {EXTENDED_CUISINES.map((cuisine) => (
              <button
                key={cuisine}
                onClick={() => toggleItem(cuisine, selectedCuisines, setSelectedCuisines)}
                className={`chip-luxury ${selectedCuisines.includes(cuisine) ? "selected" : ""}`}
              >
                {formatLabel(cuisine)}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Activity Sheet */}
      <Sheet open={activitySheetOpen} onOpenChange={setActivitySheetOpen}>
        <SheetContent side="bottom" className="bg-card border-border rounded-t-[18px]">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-luxury-heading">More Activities</SheetTitle>
          </SheetHeader>
          <div className="flex flex-wrap gap-2 pb-8">
            {EXTENDED_ACTIVITIES.map((activity) => (
              <button
                key={activity}
                onClick={() => toggleItem(activity, selectedActivities, setSelectedActivities)}
                className={`chip-luxury ${selectedActivities.includes(activity) ? "selected" : ""}`}
              >
                {formatLabel(activity)}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Religious Dietary Sheet */}
      <Sheet open={religiousSheetOpen} onOpenChange={setReligiousSheetOpen}>
        <SheetContent side="bottom" className="bg-card border-border rounded-t-[18px]">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-luxury-heading">Religious Restrictions</SheetTitle>
          </SheetHeader>
          <div className="flex flex-wrap gap-2 pb-8">
            {RELIGIOUS_DIETARY.map((item) => (
              <button
                key={item}
                onClick={() => toggleItem(item, selectedDietary, setSelectedDietary)}
                className={`chip-luxury ${selectedDietary.includes(item) ? "selected" : ""}`}
              >
                {formatLabel(item)}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Profile;
