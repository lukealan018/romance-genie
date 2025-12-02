import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Primary options shown directly on page
const PRIMARY_CUISINES = ["italian", "mexican", "sushi", "steakhouse", "thai", "american"];
const EXTENDED_CUISINES = ["japanese", "chinese", "indian", "korean", "mediterranean", "french", "vietnamese", "bbq", "seafood", "pizza"];

const PRIMARY_ACTIVITIES = ["movies", "live_music", "comedy", "mini_golf", "escape_room"];
const EXTENDED_ACTIVITIES = ["bowling", "arcade", "museum", "wine", "hike", "karaoke", "spa", "art_gallery"];

const PRIMARY_DIETARY = ["vegetarian", "vegan", "gluten_free"];
const RELIGIOUS_DIETARY = ["halal", "kosher"];

const RECOMMENDATION_STYLES = [
  { value: "popular", label: "Popular", description: "Well-known favorites" },
  { value: "balanced", label: "Balanced", description: "Mix of popular & hidden gems" },
  { value: "hidden_gems", label: "Hidden Gems", description: "Unique local discoveries" },
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
    <div className="min-h-screen bg-background p-4 pb-8">
      <div className="max-w-xl mx-auto space-y-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
            <p className="text-sm text-muted-foreground">Manage your preferences</p>
          </div>
        </div>

        {/* Card 1: Basic Information */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-sm font-medium">Name</Label>
              <Input
                id="nickname"
                placeholder="Your name"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={50}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip" className="text-sm font-medium">Home ZIP Code</Label>
              <Input
                id="zip"
                placeholder="90210"
                value={homeZip}
                onChange={(e) => setHomeZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                maxLength={5}
                className="h-11"
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Search Radius</Label>
                <span className="text-sm font-semibold text-primary">{defaultRadius} miles</span>
              </div>
              <Slider
                value={[defaultRadius]}
                onValueChange={(v) => setDefaultRadius(v[0])}
                min={3}
                max={25}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>3 mi</span>
                <span>25 mi</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Your Preferences */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Your Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cuisines */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Favorite Cuisines</Label>
              <div className="flex flex-wrap gap-2 items-center">
                {PRIMARY_CUISINES.map((cuisine) => (
                  <Badge
                    key={cuisine}
                    variant={selectedCuisines.includes(cuisine) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:scale-105",
                      selectedCuisines.includes(cuisine) 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-accent"
                    )}
                    onClick={() => toggleItem(cuisine, selectedCuisines, setSelectedCuisines)}
                  >
                    {formatLabel(cuisine)}
                  </Badge>
                ))}
                <Sheet open={cuisineSheetOpen} onOpenChange={setCuisineSheetOpen}>
                  <SheetTrigger asChild>
                    <Badge
                      variant="outline"
                      className="cursor-pointer ml-auto border-dashed hover:bg-accent"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      More
                    </Badge>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[50vh]">
                    <SheetHeader>
                      <SheetTitle>More Cuisines</SheetTitle>
                      <SheetDescription>Select additional cuisine preferences</SheetDescription>
                    </SheetHeader>
                    <div className="flex flex-wrap gap-2 mt-6">
                      {EXTENDED_CUISINES.map((cuisine) => (
                        <Badge
                          key={cuisine}
                          variant={selectedCuisines.includes(cuisine) ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer transition-all duration-200 hover:scale-105",
                            selectedCuisines.includes(cuisine) 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-accent"
                          )}
                          onClick={() => toggleItem(cuisine, selectedCuisines, setSelectedCuisines)}
                        >
                          {formatLabel(cuisine)}
                        </Badge>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            {/* Activities */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Favorite Activities</Label>
              <div className="flex flex-wrap gap-2 items-center">
                {PRIMARY_ACTIVITIES.map((activity) => (
                  <Badge
                    key={activity}
                    variant={selectedActivities.includes(activity) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:scale-105",
                      selectedActivities.includes(activity) 
                        ? "bg-primary text-primary-foreground" 
                        : "hover:bg-accent"
                    )}
                    onClick={() => toggleItem(activity, selectedActivities, setSelectedActivities)}
                  >
                    {formatLabel(activity)}
                  </Badge>
                ))}
                <Sheet open={activitySheetOpen} onOpenChange={setActivitySheetOpen}>
                  <SheetTrigger asChild>
                    <Badge
                      variant="outline"
                      className="cursor-pointer ml-auto border-dashed hover:bg-accent"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      More
                    </Badge>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[50vh]">
                    <SheetHeader>
                      <SheetTitle>More Activities</SheetTitle>
                      <SheetDescription>Select additional activity preferences</SheetDescription>
                    </SheetHeader>
                    <div className="flex flex-wrap gap-2 mt-6">
                      {EXTENDED_ACTIVITIES.map((activity) => (
                        <Badge
                          key={activity}
                          variant={selectedActivities.includes(activity) ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer transition-all duration-200 hover:scale-105",
                            selectedActivities.includes(activity) 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-accent"
                          )}
                          onClick={() => toggleItem(activity, selectedActivities, setSelectedActivities)}
                        >
                          {formatLabel(activity)}
                        </Badge>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Recommendation Style */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Recommendation Style</CardTitle>
            <CardDescription>Choose how adventurous you want your suggestions to be</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {RECOMMENDATION_STYLES.map((style) => (
                <button
                  key={style.value}
                  onClick={() => setNoveltyPreference(style.value)}
                  className={cn(
                    "flex flex-col items-center justify-center p-4 rounded-lg border transition-all duration-200",
                    noveltyPreference === style.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50 hover:bg-accent"
                  )}
                >
                  <span className="font-medium text-sm">{style.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Dietary Needs */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Dietary Needs</CardTitle>
            <CardDescription>Optional dietary restrictions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 items-center">
              {PRIMARY_DIETARY.map((diet) => (
                <Badge
                  key={diet}
                  variant={selectedDietary.includes(diet) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:scale-105",
                    selectedDietary.includes(diet) 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-accent"
                  )}
                  onClick={() => toggleItem(diet, selectedDietary, setSelectedDietary)}
                >
                  {formatLabel(diet)}
                </Badge>
              ))}
              <Sheet open={religiousSheetOpen} onOpenChange={setReligiousSheetOpen}>
                <SheetTrigger asChild>
                  <Badge
                    variant={RELIGIOUS_DIETARY.some(d => selectedDietary.includes(d)) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:scale-105",
                      RELIGIOUS_DIETARY.some(d => selectedDietary.includes(d))
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    )}
                  >
                    Religious
                  </Badge>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[40vh]">
                  <SheetHeader>
                    <SheetTitle>Religious Restrictions</SheetTitle>
                    <SheetDescription>Select any religious dietary requirements</SheetDescription>
                  </SheetHeader>
                  <div className="flex flex-wrap gap-3 mt-6">
                    {RELIGIOUS_DIETARY.map((diet) => (
                      <Badge
                        key={diet}
                        variant={selectedDietary.includes(diet) ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer transition-all duration-200 hover:scale-105 text-base py-2 px-4",
                          selectedDietary.includes(diet) 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-accent"
                        )}
                        onClick={() => toggleItem(diet, selectedDietary, setSelectedDietary)}
                      >
                        {formatLabel(diet)}
                      </Badge>
                    ))}
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="flex-1 h-12"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 h-12"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
