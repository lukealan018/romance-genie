import { useEffect, useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Check, HelpCircle, X, MessageSquare } from "lucide-react";

interface Response {
  id: string;
  responder_name: string | null;
  response: string;
  tweak_type: string | null;
  tweak_note: string | null;
  created_at: string | null;
}

interface ViewResponsesDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduledPlanId: string;
  planName?: string;
}

const responseConfig: Record<string, { label: string; icon: typeof Check; color: string }> = {
  'im_in': { label: "I'm in!", icon: Check, color: 'text-green-500' },
  'maybe': { label: 'Maybe', icon: HelpCircle, color: 'text-yellow-500' },
  'cant_make_it': { label: "Can't make it", icon: X, color: 'text-red-500' },
};

export function ViewResponsesDrawer({ open, onOpenChange, scheduledPlanId, planName }: ViewResponsesDrawerProps) {
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    const fetchResponses = async () => {
      setLoading(true);
      try {
        // First get all shared_plans for this scheduled_plan
        const { data: shares, error: sharesError } = await supabase
          .from('shared_plans')
          .select('id')
          .eq('scheduled_plan_id', scheduledPlanId);

        if (sharesError) throw sharesError;

        if (!shares || shares.length === 0) {
          setResponses([]);
          setLoading(false);
          return;
        }

        // Then get all responses for those shares
        const shareIds = shares.map(s => s.id);
        const { data: responseData, error: responsesError } = await supabase
          .from('share_responses')
          .select('*')
          .in('share_id', shareIds)
          .order('created_at', { ascending: false });

        if (responsesError) throw responsesError;

        setResponses(responseData || []);
      } catch (error) {
        console.error('Error fetching responses:', error);
        setResponses([]);
      } finally {
        setLoading(false);
      }
    };

    fetchResponses();
  }, [open, scheduledPlanId]);

  // Count responses by type
  const counts = responses.reduce((acc, r) => {
    acc[r.response] = (acc[r.response] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border/50">
          <DrawerTitle className="text-xl">Responses</DrawerTitle>
          <DrawerDescription>
            {planName ? `For ${planName}` : 'See who responded to your shared plan'}
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : responses.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No responses yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Share your plan to get responses from friends
              </p>
            </div>
          ) : (
            <>
              {/* Summary badges */}
              <div className="flex gap-3 mb-4 flex-wrap">
                {counts['im_in'] && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 text-green-500 text-sm font-medium">
                    <Check className="w-4 h-4" />
                    {counts['im_in']} in
                  </div>
                )}
                {counts['maybe'] && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-500 text-sm font-medium">
                    <HelpCircle className="w-4 h-4" />
                    {counts['maybe']} maybe
                  </div>
                )}
                {counts['cant_make_it'] && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-500 text-sm font-medium">
                    <X className="w-4 h-4" />
                    {counts['cant_make_it']} can't
                  </div>
                )}
              </div>

              {/* Response list */}
              <ScrollArea className="h-[50vh]">
                <div className="space-y-3">
                  {responses.map((resp) => {
                    const config = responseConfig[resp.response] || { 
                      label: resp.response, 
                      icon: User, 
                      color: 'text-muted-foreground' 
                    };
                    const Icon = config.icon;

                    return (
                      <div
                        key={resp.id}
                        className="p-4 rounded-xl border border-border/50 bg-card/50 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <span className="font-medium">
                              {resp.responder_name || 'Anonymous'}
                            </span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${config.color}`}>
                            <Icon className="w-4 h-4" />
                            <span className="text-sm font-medium">{config.label}</span>
                          </div>
                        </div>

                        {resp.tweak_note && (
                          <div className="pl-10 text-sm text-muted-foreground">
                            {resp.tweak_type && (
                              <span className="text-xs uppercase tracking-wide text-primary/70 mr-2">
                                {resp.tweak_type.replace('_', ' ')}:
                              </span>
                            )}
                            "{resp.tweak_note}"
                          </div>
                        )}

                        {resp.created_at && (
                          <div className="pl-10 text-xs text-muted-foreground/60">
                            {new Date(resp.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
