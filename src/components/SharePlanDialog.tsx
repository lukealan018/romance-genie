import { useState } from 'react';
import { Share2, Copy, Check, MessageCircle, Heart, Users, Sparkles, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export type ShareContext = 'date' | 'friends' | 'group' | 'default';

interface SharePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduledPlanId: string;
  restaurant: {
    name: string;
    address?: string;
  };
  activity: {
    name: string;
    address?: string;
  };
  scheduledDate?: string;
  scheduledTime?: string;
}

export const SharePlanDialog = ({
  open,
  onOpenChange,
  scheduledPlanId,
  restaurant,
  activity,
  scheduledDate,
  scheduledTime,
}: SharePlanDialogProps) => {
  const [copied, setCopied] = useState(false);
  const [selectedContext, setSelectedContext] = useState<ShareContext>('date');
  const [message, setMessage] = useState('');
  const [inviteeCount, setInviteeCount] = useState<number | undefined>();
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'Share link copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy',
        variant: 'destructive',
      });
    }
  };

  const handleNativeShare = async (url: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tonight\'s Plan',
          text: `Check out our plan!`,
          url: url,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleCopyLink(url);
        }
      }
    } else {
      handleCopyLink(url);
    }
  };

  const handleSMS = (url: string) => {
    const text = encodeURIComponent(`Check out our plan for tonight! ${url}`);
    window.open(`sms:?body=${text}`, '_blank');
  };

  const handleWhatsApp = (url: string) => {
    const text = encodeURIComponent(`Check out our plan for tonight! ${url}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const createShareLink = async () => {
    setIsCreatingLink(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-share-link', {
        body: {
          scheduledPlanId,
          shareContext: selectedContext,
          message: message || undefined,
          inviteeCount: inviteeCount || undefined,
        },
      });

      if (error) throw error;
      
      const url = data.shareUrl;
      setShareUrl(url);
      
      // Try native share first, fallback to copy
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Tonight\'s Plan',
            text: 'Check out our plan!',
            url: url,
          });
        } catch (err) {
          if ((err as Error).name !== 'AbortError') {
            handleCopyLink(url);
          }
        }
      } else {
        handleCopyLink(url);
      }
    } catch (err) {
      console.error('Error creating share link:', err);
      toast({
        title: 'Error',
        description: 'Failed to create share link',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingLink(false);
    }
  };

  const resetDialog = () => {
    setShareUrl(null);
    setMessage('');
    setInviteeCount(undefined);
    setSelectedContext('date');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetDialog();
    }
    onOpenChange(newOpen);
  };

  const contextOptions = [
    { value: 'date' as ShareContext, label: 'Date', icon: Heart, emoji: '💕' },
    { value: 'friends' as ShareContext, label: 'Friends Night', icon: Sparkles, emoji: '🎉' },
    { value: 'group' as ShareContext, label: 'Group Outing', icon: Users, emoji: '👥' },
  ];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Share This Plan</DialogTitle>
          <DialogDescription>
            Create a beautiful share link for your date or friends
          </DialogDescription>
        </DialogHeader>

        {!shareUrl ? (
          <div className="space-y-5">
            {/* Context Picker */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                What's the occasion?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {contextOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedContext(option.value)}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1",
                      selectedContext === option.value
                        ? "border-primary bg-primary/10 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                        : "border-border bg-card/50 hover:bg-muted hover:border-primary/50"
                    )}
                  >
                    <span className="text-2xl">{option.emoji}</span>
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Message */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Add a message (optional)
              </label>
              <Textarea
                placeholder="Can't wait to see you! 💕"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="resize-none bg-card/50"
                rows={2}
              />
            </div>

            {/* Invitee Count - show for group context */}
            {selectedContext === 'group' && (
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  How many people? (optional)
                </label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  placeholder="e.g. 4"
                  value={inviteeCount || ''}
                  onChange={(e) => setInviteeCount(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="bg-card/50"
                />
              </div>
            )}

            {/* Create Link Button */}
            <Button 
              onClick={createShareLink} 
              disabled={isCreatingLink}
              className="w-full gap-2"
              size="lg"
            >
              {isCreatingLink ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Create & Share Link
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Share URL Display */}
            <div className="p-3 bg-muted rounded-lg break-all text-sm font-mono border border-border">
              {shareUrl}
            </div>

            {/* Share Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleCopyLink(shareUrl)}
                className="gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                Copy Link
              </Button>
              <Button 
                onClick={() => handleNativeShare(shareUrl)}
                className="gap-2"
              >
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleSMS(shareUrl)}
                className="gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                SMS
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleWhatsApp(shareUrl)}
                className="gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </Button>
            </div>

            {/* Create Another */}
            <Button
              variant="ghost"
              onClick={resetDialog}
              className="w-full text-muted-foreground"
            >
              Create another link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
