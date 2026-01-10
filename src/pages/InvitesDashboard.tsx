import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ArrowLeft, 
  Loader2, 
  Send, 
  Users, 
  Clock, 
  Check, 
  HelpCircle, 
  X,
  User,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  MoreVertical,
  Trash2,
  Pencil,
  CalendarPlus
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, isPast, addDays } from "date-fns";

interface InviteResponse {
  id: string;
  responder_name: string | null;
  response: string;
  suggestion_json: any;
  created_at: string | null;
}

interface Invite {
  id: string;
  plan_json: {
    restaurant?: { name: string; cuisine?: string };
    activity?: { name: string; category?: string };
    date?: string;
    time?: string;
  };
  invitee_count: number | null;
  expires_at: string | null;
  created_at: string | null;
  intent: string | null;
  message: string | null;
  host_name: string | null;
  responses?: InviteResponse[];
}

const responseConfig: Record<string, { label: string; icon: typeof Check; color: string }> = {
  'in': { label: "I'm in!", icon: Check, color: 'text-green-500' },
  'maybe': { label: 'Maybe', icon: HelpCircle, color: 'text-yellow-500' },
  'out': { label: "Can't make it", icon: X, color: 'text-red-500' },
  'suggest_change': { label: 'Suggested change', icon: Pencil, color: 'text-blue-500' },
};

export default function InvitesDashboard() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInvite, setExpandedInvite] = useState<string | null>(null);
  
  // Dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editMessageDialogOpen, setEditMessageDialogOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null);
  const [editedMessage, setEditedMessage] = useState("");
  const [extensionDays, setExtensionDays] = useState(7);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchInvites();
  }, []);

  const fetchInvites = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        navigate('/login');
        return;
      }

      // Fetch invites
      const { data: invitesData, error: invitesError } = await supabase
        .from('invites')
        .select('*')
        .eq('created_by', session.user.id)
        .order('created_at', { ascending: false });

      if (invitesError) throw invitesError;

      if (!invitesData || invitesData.length === 0) {
        setInvites([]);
        setLoading(false);
        return;
      }

      // Fetch responses for each invite using the host-only endpoint
      const invitesWithResponses = await Promise.all(
        invitesData.map(async (invite) => {
          try {
            const response = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-invite-responses?inviteId=${invite.id}`,
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  'Authorization': `Bearer ${session.access_token}`,
                },
              }
            );

            if (response.ok) {
              const result = await response.json();
              return {
                ...invite,
                plan_json: invite.plan_json as Invite['plan_json'],
                responses: result.responses || [],
              };
            }
          } catch (err) {
            console.error('Error fetching responses for invite:', invite.id, err);
          }
          
          return {
            ...invite,
            plan_json: invite.plan_json as Invite['plan_json'],
            responses: [],
          };
        })
      );

      setInvites(invitesWithResponses);
    } catch (error) {
      console.error('Error fetching invites:', error);
      toast({
        title: "Error",
        description: "Failed to load invites",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = (inviteId: string) => {
    const link = `${window.location.origin}/i/${inviteId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link copied!",
      description: "Share it with your friends",
    });
  };

  const getResponseCounts = (responses: InviteResponse[]) => {
    return responses.reduce((acc, r) => {
      acc[r.response] = (acc[r.response] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return isPast(new Date(expiresAt));
  };

  // Delete invite
  const handleDeleteInvite = async () => {
    if (!selectedInvite) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('invites')
        .delete()
        .eq('id', selectedInvite.id);

      if (error) throw error;

      setInvites(prev => prev.filter(i => i.id !== selectedInvite.id));
      toast({
        title: "Invite deleted",
        description: "The invite has been cancelled",
      });
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting invite:', error);
      toast({
        title: "Error",
        description: "Failed to delete invite",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
      setSelectedInvite(null);
    }
  };

  // Update message
  const handleUpdateMessage = async () => {
    if (!selectedInvite) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('invites')
        .update({ message: editedMessage || null })
        .eq('id', selectedInvite.id);

      if (error) throw error;

      setInvites(prev => prev.map(i => 
        i.id === selectedInvite.id ? { ...i, message: editedMessage || null } : i
      ));
      toast({
        title: "Message updated",
        description: "Your invite message has been updated",
      });
      setEditMessageDialogOpen(false);
    } catch (error) {
      console.error('Error updating message:', error);
      toast({
        title: "Error",
        description: "Failed to update message",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
      setSelectedInvite(null);
    }
  };

  // Extend expiration
  const handleExtendExpiration = async () => {
    if (!selectedInvite) return;
    
    setIsUpdating(true);
    try {
      const currentExpiry = selectedInvite.expires_at 
        ? new Date(selectedInvite.expires_at) 
        : new Date();
      const newExpiry = addDays(
        isPast(currentExpiry) ? new Date() : currentExpiry, 
        extensionDays
      );

      const { error } = await supabase
        .from('invites')
        .update({ expires_at: newExpiry.toISOString() })
        .eq('id', selectedInvite.id);

      if (error) throw error;

      setInvites(prev => prev.map(i => 
        i.id === selectedInvite.id ? { ...i, expires_at: newExpiry.toISOString() } : i
      ));
      toast({
        title: "Expiration extended",
        description: `Invite now expires on ${format(newExpiry, 'MMM d, yyyy')}`,
      });
      setExtendDialogOpen(false);
    } catch (error) {
      console.error('Error extending expiration:', error);
      toast({
        title: "Error",
        description: "Failed to extend expiration",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
      setSelectedInvite(null);
    }
  };

  // Open dialogs
  const openDeleteDialog = (invite: Invite) => {
    setSelectedInvite(invite);
    setDeleteDialogOpen(true);
  };

  const openEditMessageDialog = (invite: Invite) => {
    setSelectedInvite(invite);
    setEditedMessage(invite.message || "");
    setEditMessageDialogOpen(true);
  };

  const openExtendDialog = (invite: Invite) => {
    setSelectedInvite(invite);
    setExtensionDays(7);
    setExtendDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="themed-page-bg min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="themed-page-bg min-h-screen">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">
              Sent Invites
            </h1>
            <p className="text-[rgba(255,255,255,0.6)] mt-1">
              Track responses to your date invitations
            </p>
          </div>
        </div>

        {/* Stats summary */}
        {invites.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <Card className="card-glass border-primary/20">
              <CardContent className="p-4 text-center">
                <Send className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold text-white">{invites.length}</div>
                <div className="text-xs text-[rgba(255,255,255,0.5)]">Sent</div>
              </CardContent>
            </Card>
            <Card className="card-glass border-primary/20">
              <CardContent className="p-4 text-center">
                <Users className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold text-white">
                  {invites.reduce((sum, i) => sum + (i.responses || []).filter(r => r.response === 'in').length, 0)}
                </div>
                <div className="text-xs text-[rgba(255,255,255,0.5)]">Confirmed</div>
              </CardContent>
            </Card>
            <Card className="card-glass border-primary/20">
              <CardContent className="p-4 text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
                <div className="text-2xl font-bold text-white">
                  {invites.reduce((sum, i) => sum + (i.responses || []).filter(r => r.response === 'maybe').length, 0)}
                </div>
                <div className="text-xs text-[rgba(255,255,255,0.5)]">Maybe</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Invites List */}
        {invites.length === 0 ? (
          <Card className="card-glass p-12 text-center">
            <Send className="w-16 h-16 mx-auto mb-4 text-[rgba(255,255,255,0.3)]" />
            <p className="text-[rgba(255,255,255,0.6)] mb-4">No invites sent yet</p>
            <Button 
              onClick={() => navigate('/')}
              className="btn-theme-primary"
            >
              Create Your First Plan
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {invites.map((invite) => {
              const expired = isExpired(invite.expires_at);
              const counts = getResponseCounts(invite.responses || []);
              const isExpanded = expandedInvite === invite.id;
              const totalResponses = (invite.responses || []).length;

              return (
                <Card 
                  key={invite.id} 
                  className={`card-glass border-primary/20 overflow-hidden transition-all ${
                    expired ? 'opacity-60' : ''
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        {/* Plan details */}
                        <div className="space-y-1">
                          {invite.plan_json.restaurant && (
                            <h3 className="font-semibold text-white text-lg">
                              {invite.plan_json.restaurant.name}
                            </h3>
                          )}
                          {invite.plan_json.activity && (
                            <p className="text-sm text-[rgba(255,255,255,0.6)]">
                              + {invite.plan_json.activity.name}
                            </p>
                          )}
                        </div>

                        {/* Message preview */}
                        {invite.message && (
                          <p className="text-xs text-[rgba(255,255,255,0.5)] italic truncate max-w-[250px]">
                            "{invite.message}"
                          </p>
                        )}
                        
                        {/* Date/time and status */}
                        <div className="flex items-center gap-3 flex-wrap">
                          {invite.plan_json.date && (
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                              {format(new Date(invite.plan_json.date), 'MMM d')}
                              {invite.plan_json.time && ` at ${invite.plan_json.time}`}
                            </span>
                          )}
                          {expired ? (
                            <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400">
                              Expired
                            </span>
                          ) : invite.expires_at && (
                            <span className="text-xs text-[rgba(255,255,255,0.4)]">
                              Expires {formatDistanceToNow(new Date(invite.expires_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick actions */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => copyInviteLink(invite.id)}
                          className="h-8 w-8"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(`/i/${invite.id}`, '_blank')}
                          className="h-8 w-8"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        
                        {/* More actions dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => openEditMessageDialog(invite)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit Message
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openExtendDialog(invite)}>
                              <CalendarPlus className="mr-2 h-4 w-4" />
                              Extend Expiration
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => openDeleteDialog(invite)}
                              className="text-red-500 focus:text-red-500"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Cancel Invite
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Response summary badges */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2 flex-wrap">
                        {counts['in'] && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
                            <Check className="w-3 h-3" />
                            {counts['in']}
                          </div>
                        )}
                        {counts['maybe'] && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-medium">
                            <HelpCircle className="w-3 h-3" />
                            {counts['maybe']}
                          </div>
                        )}
                        {counts['out'] && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-medium">
                            <X className="w-3 h-3" />
                            {counts['out']}
                          </div>
                        )}
                        {totalResponses === 0 && (
                          <span className="text-xs text-[rgba(255,255,255,0.4)]">
                            No responses yet
                          </span>
                        )}
                      </div>

                      {totalResponses > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedInvite(isExpanded ? null : invite.id)}
                          className="text-xs"
                        >
                          {isExpanded ? (
                            <>Hide <ChevronUp className="ml-1 h-3 w-3" /></>
                          ) : (
                            <>View {totalResponses} <ChevronDown className="ml-1 h-3 w-3" /></>
                          )}
                        </Button>
                      )}
                    </div>

                    {/* Expanded responses */}
                    {isExpanded && totalResponses > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <ScrollArea className="max-h-[300px]">
                          <div className="space-y-3">
                            {(invite.responses || []).map((resp) => {
                              const config = responseConfig[resp.response] || { 
                                label: resp.response, 
                                icon: User, 
                                color: 'text-[rgba(255,255,255,0.6)]' 
                              };
                              const Icon = config.icon;

                              return (
                                <div
                                  key={resp.id}
                                  className="p-3 rounded-lg bg-white/5 space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                        <User className="w-3.5 h-3.5 text-primary" />
                                      </div>
                                      <span className="font-medium text-white text-sm">
                                        {resp.responder_name || 'Anonymous'}
                                      </span>
                                    </div>
                                    <div className={`flex items-center gap-1 ${config.color}`}>
                                      <Icon className="w-3.5 h-3.5" />
                                      <span className="text-xs font-medium">{config.label}</span>
                                    </div>
                                  </div>

                                  {resp.suggestion_json && (
                                    <div className="pl-9 text-xs text-[rgba(255,255,255,0.5)]">
                                      {resp.suggestion_json.note && `"${resp.suggestion_json.note}"`}
                                    </div>
                                  )}

                                  {resp.created_at && (
                                    <div className="pl-9 text-[10px] text-[rgba(255,255,255,0.3)]">
                                      {format(new Date(resp.created_at), 'MMM d, h:mm a')}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cancel Invite</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this invite? This action cannot be undone and all responses will be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isUpdating}
            >
              Keep Invite
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteInvite}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Cancel Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Message Dialog */}
      <Dialog open={editMessageDialogOpen} onOpenChange={setEditMessageDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Message</DialogTitle>
            <DialogDescription>
              Update the personal message shown to your invitees.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="message" className="text-sm font-medium mb-2 block">
              Message
            </Label>
            <Input
              id="message"
              value={editedMessage}
              onChange={(e) => setEditedMessage(e.target.value)}
              placeholder="Add a personal note..."
              className="bg-background"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditMessageDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateMessage}
              disabled={isUpdating}
              className="btn-theme-primary"
            >
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Expiration Dialog */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Extend Expiration</DialogTitle>
            <DialogDescription>
              {selectedInvite?.expires_at && isPast(new Date(selectedInvite.expires_at))
                ? "This invite has expired. Extending will set a new expiration from today."
                : "Extend the invite expiration date to give more time for responses."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="days" className="text-sm font-medium mb-2 block">
              Extend by (days)
            </Label>
            <div className="flex gap-2">
              {[3, 7, 14, 30].map((days) => (
                <Button
                  key={days}
                  variant={extensionDays === days ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExtensionDays(days)}
                  className={extensionDays === days ? "btn-theme-primary" : ""}
                >
                  {days}
                </Button>
              ))}
            </div>
            {selectedInvite?.expires_at && (
              <p className="text-xs text-muted-foreground mt-3">
                New expiration: {format(
                  addDays(
                    isPast(new Date(selectedInvite.expires_at)) 
                      ? new Date() 
                      : new Date(selectedInvite.expires_at), 
                    extensionDays
                  ), 
                  'MMMM d, yyyy'
                )}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtendDialogOpen(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleExtendExpiration}
              disabled={isUpdating}
              className="btn-theme-primary"
            >
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Extend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
