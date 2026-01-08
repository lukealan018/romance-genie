import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  ExternalLink
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow, isPast } from "date-fns";

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
  host_name: string | null;
  responses?: InviteResponse[];
}

const responseConfig: Record<string, { label: string; icon: typeof Check; color: string }> = {
  'im_in': { label: "I'm in!", icon: Check, color: 'text-green-500' },
  'maybe': { label: 'Maybe', icon: HelpCircle, color: 'text-yellow-500' },
  'cant_make_it': { label: "Can't make it", icon: X, color: 'text-red-500' },
};

export default function InvitesDashboard() {
  const navigate = useNavigate();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInvite, setExpandedInvite] = useState<string | null>(null);

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

      // Fetch responses for all invites
      const inviteIds = invitesData.map(i => i.id);
      const { data: responsesData, error: responsesError } = await supabase
        .from('invite_responses')
        .select('*')
        .in('invite_id', inviteIds)
        .order('created_at', { ascending: false });

      if (responsesError) throw responsesError;

      // Map responses to invites
      const invitesWithResponses = invitesData.map(invite => ({
        ...invite,
        plan_json: invite.plan_json as Invite['plan_json'],
        responses: (responsesData || []).filter(r => r.invite_id === invite.id)
      }));

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
                  {invites.reduce((sum, i) => sum + (i.responses || []).filter(r => r.response === 'im_in').length, 0)}
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
                        
                        {/* Date/time and status */}
                        <div className="flex items-center gap-3 flex-wrap">
                          {invite.plan_json.date && (
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                              {format(new Date(invite.plan_json.date), 'MMM d')}
                              {invite.plan_json.time && ` at ${invite.plan_json.time}`}
                            </span>
                          )}
                          {expired && (
                            <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400">
                              Expired
                            </span>
                          )}
                          {invite.created_at && (
                            <span className="text-xs text-[rgba(255,255,255,0.4)]">
                              Sent {formatDistanceToNow(new Date(invite.created_at), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick actions */}
                      <div className="flex items-center gap-2">
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
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    {/* Response summary badges */}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2 flex-wrap">
                        {counts['im_in'] && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-medium">
                            <Check className="w-3 h-3" />
                            {counts['im_in']}
                          </div>
                        )}
                        {counts['maybe'] && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-medium">
                            <HelpCircle className="w-3 h-3" />
                            {counts['maybe']}
                          </div>
                        )}
                        {counts['cant_make_it'] && (
                          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-medium">
                            <X className="w-3 h-3" />
                            {counts['cant_make_it']}
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
    </div>
  );
}
