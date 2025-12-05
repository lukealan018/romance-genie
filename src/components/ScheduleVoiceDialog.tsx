import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, Calendar, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useScheduledPlansStore } from "@/store/scheduledPlansStore";
import { ConflictWarningCard } from "./ConflictWarningCard";

interface ScheduleVoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planDetails: {
    restaurant: any;
    activity: any;
  };
  searchMode?: 'both' | 'restaurant_only' | 'activity_only';
}

export function ScheduleVoiceDialog({ open, onOpenChange, planDetails, searchMode = 'both' }: ScheduleVoiceDialogProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedDateTime, setParsedDateTime] = useState<any>(null);
  const [showManualPicker, setShowManualPicker] = useState(false);
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("19:00");
  const [confirmationNumbers, setConfirmationNumbers] = useState({ restaurant: "", activity: "" });
  const [availabilityData, setAvailabilityData] = useState<any>(null);
  const [voiceAttempts, setVoiceAttempts] = useState(0);
  const [restaurantHours, setRestaurantHours] = useState<any>(null);
  const [activityHours, setActivityHours] = useState<any>(null);

  const addScheduledPlan = useScheduledPlansStore((state) => state.addScheduledPlan);

  const startVoiceRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error("Voice recognition not supported in this browser");
      setShowManualPicker(true);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcriptText = event.results[current][0].transcript;
      setTranscript(transcriptText);

      if (event.results[current].isFinal) {
        recognition.stop();
        handleVoiceTranscript(transcriptText);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
      const newAttempts = voiceAttempts + 1;
      setVoiceAttempts(newAttempts);
      
      if (newAttempts >= 2) {
        toast.error("Voice recognition failed. Please use manual picker.");
        setShowManualPicker(true);
      } else {
        toast.error("Voice recognition error. Try again or use manual picker.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleVoiceTranscript = async (text: string) => {
    setIsProcessing(true);
    try {
      const response = await supabase.functions.invoke('interpret-schedule-voice', {
        body: { transcript: text }
      });

      if (!response) throw new Error('No response from voice interpreter');
      if (response.error) throw response.error;
      
      const data = response.data || {};

      if (data.ambiguous) {
        setParsedDateTime({ ambiguous: true, options: data.options || [] });
      } else if (data.scheduledDate && data.scheduledTime) {
        await checkAvailability(data.scheduledDate, data.scheduledTime);
        setParsedDateTime({ date: data.scheduledDate, time: data.scheduledTime, ambiguous: false });
      } else {
        throw new Error('Could not parse date/time from voice input');
      }
    } catch (error) {
      console.error('Error parsing voice:', error);
      toast.error("Could not understand the date/time. Please try again or use manual picker.");
      setShowManualPicker(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const checkAvailability = async (date: string, time: string) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      
      // Fetch place details only for venues that exist
      const fetchPromises: Promise<any>[] = [];
      if (planDetails.restaurant?.id) {
        fetchPromises.push(
          supabase.functions.invoke('place-details', {
            body: { placeId: planDetails.restaurant.id }
          })
        );
      }
      if (planDetails.activity?.id) {
        fetchPromises.push(
          supabase.functions.invoke('place-details', {
            body: { placeId: planDetails.activity.id }
          })
        );
      }

      const results = await Promise.all(fetchPromises);
      
      // Map results based on what was fetched - with safe defaults
      let restaurantResult: any = { data: {} };
      let activityResult: any = { data: {} };
      let resultIndex = 0;
      
      if (planDetails.restaurant?.id && results[resultIndex]) {
        restaurantResult = results[resultIndex] || { data: {} };
        resultIndex++;
      }
      if (planDetails.activity?.id && results[resultIndex]) {
        activityResult = results[resultIndex] || { data: {} };
      }

      // Store hours in state for later use in handleSchedule - with null safety
      const restaurantOpeningHours = restaurantResult?.data?.opening_hours ?? null;
      const activityOpeningHours = activityResult?.data?.opening_hours ?? null;
      
      setRestaurantHours(restaurantOpeningHours);
      setActivityHours(activityOpeningHours);
      
      const response = await supabase.functions.invoke('check-availability', {
        body: {
          restaurantId: planDetails.restaurant?.id,
          activityId: planDetails.activity?.id,
          restaurantHours: restaurantOpeningHours,
          activityHours: activityOpeningHours,
          scheduledDate: date,
          scheduledTime: time,
          userId: user?.id
        }
      });

      if (!response) {
        console.error('No response from availability check');
        return;
      }
      if (response.error) {
        console.error('Availability check error:', response.error);
        return;
      }
      
      setAvailabilityData(response.data || null);
    } catch (error) {
      console.error('Error checking availability:', error);
    }
  };

  const handleSchedule = async () => {
    const finalDate = parsedDateTime?.date || manualDate;
    const finalTime = parsedDateTime?.time || manualTime;

    if (!finalDate || !finalTime) {
      toast.error("Please provide both date and time");
      return;
    }

    // Mode-aware validation
    const needsRestaurant = searchMode === 'both' || searchMode === 'restaurant_only';
    const needsActivity = searchMode === 'both' || searchMode === 'activity_only';
    
    if (needsRestaurant && !planDetails.restaurant) {
      toast.error("Restaurant is required to schedule");
      return;
    }
    if (needsActivity && !planDetails.activity) {
      toast.error("Activity is required to schedule");
      return;
    }

    setIsProcessing(true);
    try {
      // Fetch weather forecast and venue details (if not already cached from availability check)
      const fetchPromises: Promise<any>[] = [];
      
      // Only fetch weather if we have a venue with coordinates
      const weatherVenue = planDetails.restaurant || planDetails.activity;
      if (weatherVenue?.lat && weatherVenue?.lng) {
        fetchPromises.push(
          supabase.functions.invoke('fetch-weather-forecast', {
            body: {
              lat: weatherVenue.lat,
              lng: weatherVenue.lng,
              scheduledDate: finalDate
            }
          })
        );
      }

      // Only fetch place details for venues that exist and don't have cached hours
      if (planDetails.restaurant && !restaurantHours) {
        fetchPromises.push(
          supabase.functions.invoke('place-details', {
            body: { placeId: planDetails.restaurant.id }
          }).then(res => ({ type: 'restaurant', ...res }))
        );
      }
      if (planDetails.activity && !activityHours) {
        fetchPromises.push(
          supabase.functions.invoke('place-details', {
            body: { placeId: planDetails.activity.id }
          }).then(res => ({ type: 'activity', ...res }))
        );
      }

      const results = await Promise.all(fetchPromises);
      
      // Extract results by type
      let weatherData = null;
      let restaurantResult: any = { data: { website: null } };
      let activityResult: any = { data: { website: null } };
      
      for (const result of results) {
        if (result?.type === 'restaurant') {
          restaurantResult = result;
        } else if (result?.type === 'activity') {
          activityResult = result;
        } else if (result?.data && !result?.data?.error) {
          // Weather result (first one without type)
          weatherData = result.data;
        }
      }

      // Build scheduled plan with mode-aware data
      const scheduledPlan = await addScheduledPlan({
        scheduled_date: finalDate,
        scheduled_time: finalTime,
        restaurant_id: planDetails.restaurant?.id || 'none',
        restaurant_name: planDetails.restaurant?.name || 'No Restaurant',
        restaurant_address: planDetails.restaurant?.address || null,
        restaurant_cuisine: planDetails.restaurant?.cuisine || null,
        restaurant_lat: planDetails.restaurant?.lat || null,
        restaurant_lng: planDetails.restaurant?.lng || null,
        restaurant_website: restaurantResult?.data?.website ?? null,
        restaurant_hours: restaurantHours,
        activity_id: planDetails.activity?.id || 'none',
        activity_name: planDetails.activity?.name || 'No Activity',
        activity_address: planDetails.activity?.address || null,
        activity_category: planDetails.activity?.category || null,
        activity_lat: planDetails.activity?.lat || null,
        activity_lng: planDetails.activity?.lng || null,
        activity_website: activityResult?.data?.website ?? null,
        activity_hours: activityHours,
        weather_forecast: weatherData,
        confirmation_numbers: confirmationNumbers.restaurant || confirmationNumbers.activity ? confirmationNumbers : undefined,
        availability_status: availabilityData?.status || 'pending',
        conflict_warnings: availabilityData?.conflicts || [],
        search_mode: searchMode
      });

      if (scheduledPlan) {
        toast.success(`✓ Plan scheduled for ${new Date(finalDate).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} at ${finalTime}`);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error scheduling plan:', error);
      toast.error("Failed to schedule plan");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-8 sm:p-10">
        <DialogHeader className="space-y-3 pb-6">
          <DialogTitle className="text-2xl">Schedule This Plan</DialogTitle>
          <DialogDescription>
            Use voice or manual entry to schedule your date night
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          {!parsedDateTime && !showManualPicker && (
            <div className="space-y-6">
              <Button
                size="lg"
                onClick={startVoiceRecording}
                disabled={isListening || isProcessing}
                className="w-full py-6 text-lg"
              >
                {isListening ? <Mic className="w-4 h-4 mr-2 animate-pulse" /> : <Mic className="w-4 h-4 mr-2" />}
                {isListening ? 'Listening...' : isProcessing ? 'Processing...' : 'Schedule with Voice 🎤'}
              </Button>
              {transcript && <p className="text-sm text-muted-foreground text-center">"{transcript}"</p>}
              
              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-background text-muted-foreground">or enter manually</span>
                </div>
              </div>
              
              <Button size="lg" variant="outline" onClick={() => setShowManualPicker(true)} className="w-full py-6 text-lg">
                <Calendar className="w-4 h-4 mr-2" /> Manual Entry
              </Button>
            </div>
          )}

          {parsedDateTime?.ambiguous && (
            <div className="space-y-3">
              <Label>Did you mean?</Label>
              {parsedDateTime.options.map((option: any, idx: number) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    await checkAvailability(option.date, option.time);
                    setParsedDateTime({ date: option.date, time: option.time, ambiguous: false });
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          )}

          {(parsedDateTime?.date || showManualPicker) && !parsedDateTime?.ambiguous && (
            <div className="space-y-8">
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date
                </Label>
                <Input
                  type="date"
                  value={parsedDateTime?.date || manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="h-14 text-base"
                />
              </div>
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time
                </Label>
                <Input
                  type="time"
                  value={parsedDateTime?.time || manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="h-14 text-base"
                />
              </div>

              {availabilityData?.conflicts && availabilityData.conflicts.length > 0 && (
                <div className="space-y-2">
                  {availabilityData.conflicts.map((conflict: any, idx: number) => (
                    <ConflictWarningCard key={idx} conflict={conflict} />
                  ))}
                </div>
              )}

              <div className="space-y-4 pt-4 border-t border-border">
                <p className="text-sm font-medium">Confirmation Numbers (Optional)</p>
                {(searchMode === 'both' || searchMode === 'restaurant_only') && planDetails.restaurant && (
                  <Input
                    placeholder="Restaurant confirmation"
                    value={confirmationNumbers.restaurant}
                    onChange={(e) => setConfirmationNumbers(prev => ({ ...prev, restaurant: e.target.value }))}
                    className="h-12"
                  />
                )}
                {(searchMode === 'both' || searchMode === 'activity_only') && planDetails.activity && (
                  <Input
                    placeholder="Activity confirmation"
                    value={confirmationNumbers.activity}
                    onChange={(e) => setConfirmationNumbers(prev => ({ ...prev, activity: e.target.value }))}
                    className="h-12"
                  />
                )}
              </div>

              <Button size="lg" onClick={handleSchedule} disabled={isProcessing} className="w-full py-6 text-lg mt-8">
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                {searchMode === 'restaurant_only' && "Schedule Dinner"}
                {searchMode === 'activity_only' && "Schedule Activity"}
                {(!searchMode || searchMode === 'both') && "Schedule Plan"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
