import { useState } from 'react';
import { 
  Share2, Copy, Check, MessageCircle, 
  Heart, HeartHandshake, Flame,
  Users, UsersRound, UserPlus,
  PartyPopper, Sparkles, Music,
  type LucideIcon
} from 'lucide-react';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Textarea } from './ui/textarea';
import { toast } from './ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
interface SharePlanButtonProps {
  scheduledPlanId?: string;
  restaurant: {
    name: string;
    address: string;
  };
  activity: {
    name: string;
    address: string;
  };
  scheduledDate?: string;
  scheduledTime?: string;
}

type ShareContext = 'date' | 'friends' | 'group' | 'default';

interface IconOption {
  icon: LucideIcon;
  label: string;
}

interface ContextOption {
  value: ShareContext;
  label: string;
  emoji: string;
  icons: IconOption[];
}

const contextOptions: ContextOption[] = [
  { 
    value: 'date', 
    label: 'Date Night', 
    emoji: '💕',

    icons: [
      { icon: HeartHandshake, label: 'Connection' },
      { icon: Heart, label: 'Love' },
      { icon: Flame, label: 'Sparks' },
    ]
  },
  { 
    value: 'friends', 
    label: 'Friends Night', 
    emoji: '🎉',
    icons: [
      { icon: PartyPopper, label: 'Party' },
      { icon: Sparkles, label: 'Fun' },
      { icon: Music, label: 'Vibes' },
    ]
  },
  { 
    value: 'group', 
    label: 'Group Outing', 
    emoji: '👥',
    icons: [
      { icon: UsersRound, label: 'Team' },
      { icon: Users, label: 'Group' },
      { icon: UserPlus, label: 'Invite' },
    ]
  },
];

export const SharePlanButton = ({
  scheduledPlanId,
  restaurant,
  activity,
  scheduledDate,
  scheduledTime,
}: SharePlanButtonProps) => {
  const [copied, setCopied] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [selectedContext, setSelectedContext] = useState<ShareContext>('date');
  const [selectedIconIndex, setSelectedIconIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  // Get the current icon based on context and selection
  const getCurrentIcon = () => {
    const context = contextOptions.find(c => c.value === selectedContext);
    if (!context) return HeartHandshake;
    return context.icons[selectedIconIndex]?.icon || context.icons[0].icon;
  };

  const CurrentIcon = getCurrentIcon();

  const generateShareText = () => {
    let text = `✨ Tonight's Plan via Andate\n\n`;
    text += `🍽️ Dinner: ${restaurant.name}\n`;
    text += `📍 ${restaurant.address}\n\n`;
    text += `✨ Activity: ${activity.name}\n`;
    text += `📍 ${activity.address}`;
    
    if (scheduledDate) {
      text += `\n\n📅 ${scheduledDate}`;
      if (scheduledTime) {
        text += ` at ${scheduledTime}`;
      }
    }
    
    return text;
  };

  const handleCopyLink = async (url?: string) => {
    const textToCopy = url || generateShareText();
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: url ? 'Share link copied to clipboard' : 'Plan copied to clipboard',
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

  const handleNativeShare = async (url?: string) => {
    const text = url || generateShareText();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Date Night Plan',
          text: url ? `Check out our plan! ${url}` : text,
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

  const handleSMS = (url?: string) => {
    // Short message with link for beautiful invite page
    const text = encodeURIComponent(url ? `You're invited! 💕 ${url}` : generateShareText());
    window.open(`sms:?body=${text}`, '_blank');
  };

  const handleWhatsApp = (url?: string) => {
    const text = encodeURIComponent(url ? `You're invited! 💕 ${url}` : generateShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const createShareLink = async () => {
    if (!scheduledPlanId) {
      toast({
        title: 'Cannot create share link',
        description: 'This plan needs to be scheduled first.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingLink(true);
    try {
      // Create invite with plan JSON for beautiful landing page
      const { data, error } = await supabase.functions.invoke('create-invite', {
        body: {
          planJson: {
            restaurant: {
              id: scheduledPlanId,
              name: restaurant.name,
              address: restaurant.address,
            },
            activity: {
              id: scheduledPlanId,
              name: activity.name,
              address: activity.address,
            },
            scheduledDate,
            scheduledTime,
          },
          hostName: 'Someone special',
          intent: message || undefined,
          inviteeCount: 1,
        },
      });

      if (error) throw error;
      
      setShareUrl(data.inviteUrl);
      toast({
        title: 'Invite link created!',
        description: 'Share it via SMS for a beautiful invite 💕',
      });
    } catch (err) {
      console.error('Error creating invite link:', err);
      toast({
        title: 'Error',
        description: 'Failed to create invite link',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingLink(false);
    }
  };

  // If we have a scheduled plan ID, show the enhanced share flow
  if (scheduledPlanId) {
    const currentContext = contextOptions.find(c => c.value === selectedContext);
    
    return (
      <>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2"
          onClick={() => setShowShareDialog(true)}
        >
          <CurrentIcon className="w-4 h-4" />
          Send Invite
        </Button>

        <Dialog open={showShareDialog} onOpenChange={(open) => {
          setShowShareDialog(open);
          if (!open) {
            setSelectedIconIndex(0);
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Share This Plan</DialogTitle>
              <DialogDescription>
                Create a beautiful share link for your date or friends
              </DialogDescription>
            </DialogHeader>

            {!shareUrl ? (
              <div className="space-y-4">
                {/* Context Picker */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    What's the occasion?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {contextOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedContext(option.value);
                          setSelectedIconIndex(0);
                        }}
                        className={cn(
                          "p-3 rounded-xl border transition-all flex flex-col items-center gap-1",
                          selectedContext === option.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card hover:bg-muted"
                        )}
                      >
                        <span className="text-xl">{option.emoji}</span>
                        <span className="text-xs font-medium">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon Picker */}
                {currentContext && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Choose your invite style
                    </label>
                    <div className="flex gap-2 justify-center">
                      {currentContext.icons.map((iconOption, index) => {
                        const IconComponent = iconOption.icon;
                        return (
                          <button
                            key={iconOption.label}
                            onClick={() => setSelectedIconIndex(index)}
                            className={cn(
                              "p-3 rounded-xl border transition-all flex flex-col items-center gap-1.5 min-w-[72px]",
                              selectedIconIndex === index
                                ? "border-primary bg-primary/10 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                                : "border-border bg-card hover:bg-muted text-muted-foreground"
                            )}
                          >
                            <IconComponent className="w-5 h-5" />
                            <span className="text-xs font-medium">{iconOption.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Optional Message */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    Add a message (optional)
                  </label>
                  <Textarea
                    placeholder="Can't wait! 💕"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="resize-none"
                    rows={2}
                  />
                </div>

                {/* Create Link Button */}
                <Button 
                  onClick={createShareLink} 
                  disabled={isCreatingLink}
                  className="w-full"
                >
                  {isCreatingLink ? 'Creating...' : 'Create Share Link'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Share URL Display */}
                <div className="p-3 bg-muted rounded-lg break-all text-sm font-mono">
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
                  onClick={() => {
                    setShareUrl(null);
                    setMessage('');
                  }}
                  className="w-full text-muted-foreground"
                >
                  Create another link
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Fallback to simple dropdown for non-scheduled plans
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <HeartHandshake className="w-4 h-4" />
          Send Invite
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => handleNativeShare()} className="gap-2 cursor-pointer">
          <Share2 className="w-4 h-4" />
          Share Plan
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleCopyLink()} className="gap-2 cursor-pointer">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          Copy to Clipboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSMS()} className="gap-2 cursor-pointer">
          <MessageCircle className="w-4 h-4" />
          Send via SMS
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleWhatsApp()} className="gap-2 cursor-pointer">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          WhatsApp
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
