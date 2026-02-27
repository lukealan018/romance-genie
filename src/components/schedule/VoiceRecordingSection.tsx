import { Button } from "@/components/ui/button";
import { Mic, Calendar } from "lucide-react";

interface VoiceRecordingSectionProps {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  onStartVoice: () => void;
  onShowManualPicker: () => void;
}

export function VoiceRecordingSection({
  isListening,
  isProcessing,
  transcript,
  onStartVoice,
  onShowManualPicker,
}: VoiceRecordingSectionProps) {
  return (
    <div className="space-y-6">
      <Button
        size="lg"
        onClick={onStartVoice}
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
      
      <Button size="lg" variant="outline" onClick={onShowManualPicker} className="w-full py-6 text-lg">
        <Calendar className="w-4 h-4 mr-2" /> Manual Entry
      </Button>
    </div>
  );
}
