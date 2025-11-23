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
      // Fetch weather forecast
      const { data: weatherData } = await supabase.functions.invoke('fetch-weather-forecast', {
        body: {
          lat: planDetails.restaurant.lat,
          lng: planDetails.restaurant.lng,
          scheduledDate: finalDate
        }
      });

      const scheduledPlan = await addScheduledPlan({
        scheduled_date: finalDate,
        scheduled_time: finalTime,
        restaurant_id: planDetails.restaurant.id,
        restaurant_name: planDetails.restaurant.name,
        restaurant_address: planDetails.restaurant.address,
        restaurant_cuisine: planDetails.restaurant.cuisine,
        restaurant_lat: planDetails.restaurant.lat,
        restaurant_lng: planDetails.restaurant.lng,
        activity_id: planDetails.activity.id,
        activity_name: planDetails.activity.name,
        activity_address: planDetails.activity.address,
        activity_category: planDetails.activity.category,
        activity_lat: planDetails.activity.lat,
        activity_lng: planDetails.activity.lng,
        weather_forecast: weatherData,
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
      <DialogContent className="max-w-md p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle>Schedule This Plan</DialogTitle>
          <DialogDescription>
            Use voice or manual entry to schedule your date night
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {!parsedDateTime && !showManualPicker && (
            <div className="text-center space-y-4">
              <Button
                size="lg"
                onClick={startVoiceRecording}
                disabled={isListening || isProcessing}
                className="w-full"
              >
                {isListening ? (
                  <><Mic className="w-5 h-5 mr-2 animate-pulse" /> Listening...</>
                ) : isProcessing ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><Mic className="w-5 h-5 mr-2" /> Schedule with Voice</>
                )}
              </Button>
              {transcript && <p className="text-sm text-muted-foreground">"{transcript}"</p>}
              <Button size="lg" variant="outline" onClick={() => setShowManualPicker(true)} className="w-full">
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
            <div className="space-y-6">
              <div className="space-y-3">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={parsedDateTime?.date || manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="h-14 text-lg"
                />
              </div>
              <div className="space-y-3">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={parsedDateTime?.time || manualTime}
                  onChange={(e) => setManualTime(e.target.value)}
                  className="h-14 text-lg"
                />
              </div>

              {availabilityData?.conflicts && availabilityData.conflicts.length > 0 && (
                <div className="space-y-2">
                  {availabilityData.conflicts.map((conflict: any, idx: number) => (
                    <ConflictWarningCard key={idx} conflict={conflict} />
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <Label>Confirmation Numbers (Optional)</Label>
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

              <Button size="lg" onClick={handleSchedule} disabled={isProcessing} className="w-full h-14 text-lg">
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
