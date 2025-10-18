import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useUserId } from "@/hooks/use-user-id";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

const CUISINES = ["italian", "mexican", "japanese", "thai", "sushi", "steakhouse", "vegan", "bbq", "burgers"];
const ACTIVITIES = ["comedy", "live_music", "movies", "bowling", "arcade", "museum", "escape_room", "mini_golf", "hike", "wine"];
const DIETARY = ["gluten_free", "vegetarian", "vegan", "halal", "kosher"];

const Profile = () => {
  const navigate = useNavigate();
  const userId = useUserId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [nickname, setNickname] = useState("");
  const [homeZip, setHomeZip] = useState("");
  const [defaultRadius, setDefaultRadius] = useState(7);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/profile`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'X-User-Id': userId,
          },
        }
      );

      if (response.status === 200) {
        const profile = await response.json();
        setNickname(profile.nickname || "");
        setHomeZip(profile.home_zip || "");
        setDefaultRadius(profile.default_radius_mi ?? 7);
        setSelectedCuisines(profile.cuisines || []);
        setSelectedActivities(profile.activities || []);
        setSelectedDietary(profile.dietary || []);
      } else if (response.status === 404) {
        toast({
          title: "No profile found",
          description: "Please complete onboarding first",
          variant: "destructive",
        });
        navigate("/onboarding");
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
    // Validation
    if (!nickname.trim()) {
      toast({
        title: "Validation Error",
        description: "Nickname is required",
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

    if (selectedCuisines.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one cuisine",
        variant: "destructive",
      });
      return;
    }

    if (selectedActivities.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one activity",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/profile`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'X-User-Id': userId,
          },
          body: JSON.stringify({
            nickname: nickname.trim(),
            home_zip: homeZip,
            default_radius_mi: defaultRadius,
            cuisines: selectedCuisines,
            activities: selectedActivities,
            dietary: selectedDietary.length > 0 ? selectedDietary : null,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "Profile updated successfully",
        });
        // Mark that profile needs refresh on Home page
        localStorage.setItem("profileNeedsRefresh", "true");
        navigate("/");
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Profile Settings</h1>
            <p className="text-muted-foreground">Update your preferences</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                placeholder="Enter your nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zip">Home ZIP Code</Label>
              <Input
                id="zip"
                placeholder="Enter 5-digit ZIP"
                value={homeZip}
                onChange={(e) => setHomeZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                maxLength={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Default Search Radius: {defaultRadius} miles</Label>
              <Slider
                value={[defaultRadius]}
                onValueChange={(v) => setDefaultRadius(v[0])}
                min={3}
                max={15}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>3 mi</span>
                <span>15 mi</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Favorite Cuisines</CardTitle>
            <CardDescription>Select at least one cuisine you enjoy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {CUISINES.map((cuisine) => (
                <Badge
                  key={cuisine}
                  variant={selectedCuisines.includes(cuisine) ? "default" : "outline"}
                  className="cursor-pointer hover:scale-105 transition-transform capitalize"
                  onClick={() => toggleItem(cuisine, selectedCuisines, setSelectedCuisines)}
                >
                  {cuisine.replace("_", " ")}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Favorite Activities</CardTitle>
            <CardDescription>Select at least one activity you enjoy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ACTIVITIES.map((activity) => (
                <Badge
                  key={activity}
                  variant={selectedActivities.includes(activity) ? "default" : "outline"}
                  className="cursor-pointer hover:scale-105 transition-transform capitalize"
                  onClick={() => toggleItem(activity, selectedActivities, setSelectedActivities)}
                >
                  {activity.replace("_", " ")}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dietary Restrictions</CardTitle>
            <CardDescription>Optional: Select any dietary restrictions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {DIETARY.map((diet) => (
                <Badge
                  key={diet}
                  variant={selectedDietary.includes(diet) ? "default" : "outline"}
                  className="cursor-pointer hover:scale-105 transition-transform capitalize"
                  onClick={() => toggleItem(diet, selectedDietary, setSelectedDietary)}
                >
                  {diet.replace("_", " ")}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
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
