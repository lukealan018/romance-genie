import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useScheduledPlansStore } from "@/store/scheduledPlansStore";
import { VoiceRecordingSection } from "./schedule/VoiceRecordingSection";
import { AmbiguousDateOptions } from "./schedule/AmbiguousDateOptions";
import { ManualDateTimePicker } from "./schedule/ManualDateTimePicker";

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
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session) {
      toast.error("Please log in to schedule plans");
      return;
    }

    const finalDate = parsedDateTime?.date || manualDate;
    const finalTime = parsedDateTime?.time || manualTime;

    if (!finalDate || !finalTime) {
      toast.error("Please provide both date and time");
      return;
    }

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
      const fetchPromises: Promise<any>[] = [];
      
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
      
      let weatherData = null;
      let restaurantResult: any = { data: { website: null } };
      let activityResult: any = { data: { website: null } };
      
      for (const result of results) {
        if (result?.type === 'restaurant') {
          restaurantResult = result;
        } else if (result?.type === 'activity') {
          activityResult = result;
        } else if (result?.data && !result?.data?.error) {
          weatherData = result.data;
        }
      }

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
        const [year, month, day] = finalDate.split('-').map(Number);
        const dateForDisplay = new Date(year, month - 1, day);
        const formattedDate = dateForDisplay.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        
        const [hours, minutes] = finalTime.split(':').map(Number);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
        
        toast.success(`✓ Plan scheduled for ${formattedDate} at ${formattedTime}`);
        onOpenChange(false);
      } else {
        toast.error("Failed to save your plan. Please make sure you're logged in.");
      }
    } catch (error) {
      console.error('Error scheduling plan:', error);
      toast.error("Failed to schedule plan");
    } finally {
      setIsProcessing(false);
    }
  };

  const currentDate = parsedDateTime?.date || manualDate;
  const currentTime = parsedDateTime?.time || manualTime;
  const conflicts = availabilityData?.conflicts || [];

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
            <VoiceRecordingSection
              isListening={isListening}
              isProcessing={isProcessing}
              transcript={transcript}
              onStartVoice={startVoiceRecording}
              onShowManualPicker={() => setShowManualPicker(true)}
            />
          )}

          {parsedDateTime?.ambiguous && (
            <AmbiguousDateOptions
              options={parsedDateTime.options}
              onSelect={async (date, time) => {
                await checkAvailability(date, time);
                setParsedDateTime({ date, time, ambiguous: false });
              }}
            />
          )}

          {(parsedDateTime?.date || showManualPicker) && !parsedDateTime?.ambiguous && (
            <ManualDateTimePicker
              date={currentDate}
              time={currentTime}
              onDateChange={setManualDate}
              onTimeChange={setManualTime}
              conflicts={conflicts}
              confirmationNumbers={confirmationNumbers}
              onConfirmationChange={(field, value) =>
                setConfirmationNumbers(prev => ({ ...prev, [field]: value }))
              }
              searchMode={searchMode}
              hasRestaurant={!!planDetails.restaurant}
              hasActivity={!!planDetails.activity}
              isProcessing={isProcessing}
              onSchedule={handleSchedule}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
