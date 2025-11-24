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
}

export function ScheduleVoiceDialog({ open, onOpenChange, planDetails }: ScheduleVoiceDialogProps) {
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
      const { data, error } = await supabase.functions.invoke('interpret-schedule-voice', {
        body: { transcript: text }
      });

      if (error) throw error;

      if (data.ambiguous) {
        setParsedDateTime({ ambiguous: true, options: data.options });
      } else {
        await checkAvailability(data.scheduledDate, data.scheduledTime);
        setParsedDateTime({ date: data.scheduledDate, time: data.scheduledTime, ambiguous: false });
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
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('check-availability', {
        body: {
          restaurantId: planDetails.restaurant.id,
          activityId: planDetails.activity.id,
          scheduledDate: date,
          scheduledTime: time,
          userId: user?.id
        }
      });

      if (error) throw error;
      setAvailabilityData(data);
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

    setIsProcessing(true);
    try {
      // Fetch weather forecast and venue details in parallel
      const [weatherResult, restaurantResult, activityResult] = await Promise.all([
        supabase.functions.invoke('fetch-weather-forecast', {
          body: {
            lat: planDetails.restaurant.lat,
            lng: planDetails.restaurant.lng,
            scheduledDate: finalDate
          }
        }),
        supabase.functions.invoke('place-details', {
          body: { placeId: planDetails.restaurant.id }
        }),
        supabase.functions.invoke('place-details', {
          body: { placeId: planDetails.activity.id }
        })
      ]);

      const scheduledPlan = await addScheduledPlan({
        scheduled_date: finalDate,
        scheduled_time: finalTime,
        restaurant_id: planDetails.restaurant.id,
        restaurant_name: planDetails.restaurant.name,
        restaurant_address: planDetails.restaurant.address,
        restaurant_cuisine: planDetails.restaurant.cuisine,
        restaurant_lat: planDetails.restaurant.lat,
        restaurant_lng: planDetails.restaurant.lng,
        restaurant_website: restaurantResult.data?.website,
        activity_id: planDetails.activity.id,
        activity_name: planDetails.activity.name,
        activity_address: planDetails.activity.address,
        activity_category: planDetails.activity.category,
        activity_lat: planDetails.activity.lat,
        activity_lng: planDetails.activity.lng,
        activity_website: activityResult.data?.website,
        weather_forecast: weatherResult.data,
        confirmation_numbers: confirmationNumbers.restaurant || confirmationNumbers.activity ? confirmationNumbers : undefined,
        availability_status: availabilityData?.status || 'pending',
        conflict_warnings: availabilityData?.conflicts || []
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
                <Input
                  placeholder="Restaurant confirmation"
                  value={confirmationNumbers.restaurant}
                  onChange={(e) => setConfirmationNumbers(prev => ({ ...prev, restaurant: e.target.value }))}
                  className="h-12"
                />
                <Input
                  placeholder="Activity confirmation"
                  value={confirmationNumbers.activity}
                  onChange={(e) => setConfirmationNumbers(prev => ({ ...prev, activity: e.target.value }))}
                  className="h-12"
                />
              </div>

              <Button size="lg" onClick={handleSchedule} disabled={isProcessing} className="w-full py-6 text-lg mt-8">
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
                Schedule Plan
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
