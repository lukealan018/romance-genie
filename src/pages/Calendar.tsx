import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useScheduledPlansStore } from "@/store/scheduledPlansStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Calendar as CalendarIcon, MapPin, Clock, Cloud, Trash2, Share2, MessageSquare, Pencil } from "lucide-react";
import { ExportCalendarButton } from "@/components/ExportCalendarButton";
import { ConflictWarningCard } from "@/components/ConflictWarningCard";
import { AvailabilityBadge } from "@/components/AvailabilityBadge";
import { SharePlanDialog } from "@/components/SharePlanDialog";
import { ViewResponsesDrawer } from "@/components/ViewResponsesDrawer";
import { getMapUrl, yelpSearchUrl } from "@/lib/external-links";
import { toast } from "sonner";
import { EditScheduledPlanSheet } from "@/components/EditScheduledPlanSheet";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

// Parse date string without timezone issues
const parseDateString = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// Format 24h time string (HH:mm) to 12h (e.g. "7:00 PM")
const formatTime12h = (time24: string): string => {
  const [h, m] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
};

export default function Calendar() {
  const navigate = useNavigate();
  const { scheduledPlans, isLoading, fetchScheduledPlans, deleteScheduledPlan } = useScheduledPlansStore();
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [shareDialogPlan, setShareDialogPlan] = useState<typeof scheduledPlans[0] | null>(null);
  const [responsesDrawerPlan, setResponsesDrawerPlan] = useState<typeof scheduledPlans[0] | null>(null);
  const [responseCounts, setResponseCounts] = useState<Record<string, { in: number; maybe: number; cant: number }>>({});
  const [editPlan, setEditPlan] = useState<typeof scheduledPlans[0] | null>(null);

  useEffect(() => {
    fetchScheduledPlans();
  }, [fetchScheduledPlans]);

  // Fetch response counts for all plans
  useEffect(() => {
    const fetchResponseCounts = async () => {
      if (scheduledPlans.length === 0) return;

      const planIds = scheduledPlans.map(p => p.id);
      
      // Get all shared_plans for these scheduled_plans
      const { data: sharedPlans } = await supabase
        .from('shared_plans')
        .select('id, scheduled_plan_id')
        .in('scheduled_plan_id', planIds);

      if (!sharedPlans || sharedPlans.length === 0) return;

      const shareIds = sharedPlans.map(sp => sp.id);

      // Get all responses for these shares
      const { data: responses } = await supabase
        .from('share_responses')
        .select('share_id, response')
        .in('share_id', shareIds);

      if (!responses) return;

      // Map share_id back to scheduled_plan_id and count responses
      const shareToScheduled = new Map(sharedPlans.map(sp => [sp.id, sp.scheduled_plan_id]));
      const counts: Record<string, { in: number; maybe: number; cant: number }> = {};

      responses.forEach(r => {
        const scheduledId = shareToScheduled.get(r.share_id);
        if (!scheduledId) return;
        
        if (!counts[scheduledId]) {
          counts[scheduledId] = { in: 0, maybe: 0, cant: 0 };
        }
        
        if (r.response === 'in') counts[scheduledId].in++;
        else if (r.response === 'maybe') counts[scheduledId].maybe++;
        else if (r.response === 'cant') counts[scheduledId].cant++;
      });

      setResponseCounts(counts);
    };

    fetchResponseCounts();
  }, [scheduledPlans]);

  const PLAN_DURATION_HOURS = 4;

  const filteredPlans = scheduledPlans.filter(plan => {
    const [year, month, day] = plan.scheduled_date.split('-').map(Number);
    const [h, m] = plan.scheduled_time.split(':').map(Number);
    const planEnd = new Date(year, month - 1, day, h + PLAN_DURATION_HOURS, m);
    const now = new Date();
    return filter === 'upcoming' ? planEnd > now : planEnd <= now;
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('Cancel this scheduled date?')) {
      await deleteScheduledPlan(id);
      toast.success('Date cancelled');
    }
  };

  const handleRestaurantAddressClick = (e: React.MouseEvent, plan: typeof scheduledPlans[0]) => {
    e.stopPropagation();
    const url = getMapUrl(
      plan.restaurant_name,
      plan.restaurant_address ?? undefined,
      plan.restaurant_lat ?? undefined,
      plan.restaurant_lng ?? undefined
    );
    window.open(url, '_blank');
  };

  const handleActivityAddressClick = (e: React.MouseEvent, plan: typeof scheduledPlans[0]) => {
    e.stopPropagation();
    const url = getMapUrl(
      plan.activity_name,
      plan.activity_address ?? undefined,
      plan.activity_lat ?? undefined,
      plan.activity_lng ?? undefined
    );
    window.open(url, '_blank');
  };

  const handleRestaurantNameClick = (e: React.MouseEvent, plan: typeof scheduledPlans[0]) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Restaurant click - website:', plan.restaurant_website);
    
    if (plan.restaurant_website) {
      console.log('Opening website:', plan.restaurant_website);
      window.open(plan.restaurant_website, '_blank');
    } else {
      // Extract city from address for better Yelp results
      const addressParts = plan.restaurant_address?.split(',') || [];
      const city = addressParts.length > 1 ? addressParts[addressParts.length - 2].trim() : undefined;
      const yelpUrl = yelpSearchUrl(plan.restaurant_name, city);
      console.log('Opening Yelp:', yelpUrl);
      window.open(yelpUrl, '_blank');
    }
  };

  const handleActivityNameClick = (e: React.MouseEvent, plan: typeof scheduledPlans[0]) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Activity click - website:', plan.activity_website);
    
    if (plan.activity_website) {
      console.log('Opening website:', plan.activity_website);
      window.open(plan.activity_website, '_blank');
    } else {
      // Extract city from address for better Yelp results
      const addressParts = plan.activity_address?.split(',') || [];
      const city = addressParts.length > 1 ? addressParts[addressParts.length - 2].trim() : undefined;
      const yelpUrl = yelpSearchUrl(plan.activity_name, city);
      console.log('Opening Yelp:', yelpUrl);
      window.open(yelpUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-4xl mx-auto space-y-6 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                Calendar
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Your scheduled date nights</p>
            </div>
          </div>
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="space-y-4 mt-6">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading scheduled dates...</p>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="text-center py-12">
                <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">
                  {filter === 'upcoming' 
                    ? "No scheduled dates yet. Plan your next date!" 
                    : "No past dates to show."}
                </p>
                {filter === 'upcoming' && (
                  <Button onClick={() => navigate('/')} className="mt-4">
                    Plan a Date
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {filteredPlans.map((plan) => (
                  <Card key={plan.id} className="overflow-hidden">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
                              <CalendarIcon className="w-5 h-5" />
                              {parseDateString(plan.scheduled_date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </div>
                            <AvailabilityBadge status={plan.availability_status as any} />
                            {responseCounts[plan.id] && (
                              <div className="flex gap-1">
                                {responseCounts[plan.id].in > 0 && (
                                  <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
                                    {responseCounts[plan.id].in} in
                                  </Badge>
                                )}
                                {responseCounts[plan.id].maybe > 0 && (
                                  <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
                                    {responseCounts[plan.id].maybe} maybe
                                  </Badge>
                                )}
                                {responseCounts[plan.id].cant > 0 && (
                                  <Badge variant="outline" className="text-xs bg-red-500/10 text-red-400 border-red-500/30">
                                    {responseCounts[plan.id].cant} out
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-lg font-medium">
                            <Clock className="w-5 h-5" />
                            {formatTime12h(plan.scheduled_time)}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {filter === 'upcoming' && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setEditPlan(plan)}
                              title="Edit plan"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setResponsesDrawerPlan(plan)}
                            title="View responses"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setShareDialogPlan(plan)}
                            title="Share plan"
                          >
                            <Share2 className="w-4 h-4" />
                          </Button>
                          <ExportCalendarButton plan={plan} />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(plan.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {plan.weather_forecast && plan.weather_forecast.temp !== undefined && (
                        <div className="flex items-center gap-2 text-sm">
                          <Cloud className="w-4 h-4" />
                          <span>{plan.weather_forecast.temp}°F</span>
                          <span className="text-muted-foreground">{plan.weather_forecast.description ?? ''}</span>
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-muted-foreground">🍽️ Restaurant</div>
                          <div>
                            <div 
                              className="text-xl font-bold text-primary hover:underline cursor-pointer transition-colors"
                              onClick={(e) => handleRestaurantNameClick(e, plan)}
                            >
                              {plan.restaurant_name}
                            </div>
                            {plan.restaurant_cuisine && (
                              <div className="text-sm text-muted-foreground">{plan.restaurant_cuisine}</div>
                            )}
                            {plan.restaurant_address && (
                              <div 
                                className="flex items-start gap-1 text-base text-primary hover:underline cursor-pointer mt-1"
                                onClick={(e) => handleRestaurantAddressClick(e, plan)}
                              >
                                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{plan.restaurant_address}</span>
                              </div>
                            )}
                            {plan.confirmation_numbers?.restaurant && (
                              <div className="text-sm mt-1">
                                Confirmation: <span className="font-mono">{plan.confirmation_numbers.restaurant}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-muted-foreground">🎭 Activity</div>
                          <div>
                            <div 
                              className="text-xl font-bold text-primary hover:underline cursor-pointer transition-colors"
                              onClick={(e) => handleActivityNameClick(e, plan)}
                            >
                              {plan.activity_name}
                            </div>
                            {plan.activity_category && (
                              <div className="text-sm text-muted-foreground">{plan.activity_category}</div>
                            )}
                            {plan.activity_address && (
                              <div 
                                className="flex items-start gap-1 text-base text-primary hover:underline cursor-pointer mt-1"
                                onClick={(e) => handleActivityAddressClick(e, plan)}
                              >
                                <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>{plan.activity_address}</span>
                              </div>
                            )}
                            {plan.confirmation_numbers?.activity && (
                              <div className="text-sm mt-1">
                                Confirmation: <span className="font-mono">{plan.confirmation_numbers.activity}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {plan.conflict_warnings && Array.isArray(plan.conflict_warnings) && plan.conflict_warnings.length > 0 && (
                        <div className="space-y-2">
                          {plan.conflict_warnings.map((conflict: any, idx: number) => (
                            <ConflictWarningCard key={idx} conflict={conflict} />
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Share Dialog */}
      {shareDialogPlan && (
        <SharePlanDialog
          open={!!shareDialogPlan}
          onOpenChange={(open) => !open && setShareDialogPlan(null)}
          scheduledPlanId={shareDialogPlan.id}
          restaurant={{
            name: shareDialogPlan.restaurant_name,
            address: shareDialogPlan.restaurant_address ?? undefined,
          }}
          activity={{
            name: shareDialogPlan.activity_name,
            address: shareDialogPlan.activity_address ?? undefined,
          }}
          scheduledDate={shareDialogPlan.scheduled_date}
          scheduledTime={shareDialogPlan.scheduled_time}
        />
      )}

      {/* View Responses Drawer */}
      {responsesDrawerPlan && (
        <ViewResponsesDrawer
          open={!!responsesDrawerPlan}
          onOpenChange={(open) => !open && setResponsesDrawerPlan(null)}
          scheduledPlanId={responsesDrawerPlan.id}
          planName={`${responsesDrawerPlan.restaurant_name} + ${responsesDrawerPlan.activity_name}`}
        />
      )}

      {/* Edit Plan Sheet */}
      {editPlan && (
        <EditScheduledPlanSheet
          open={!!editPlan}
          onOpenChange={(open) => !open && setEditPlan(null)}
          plan={editPlan}
        />
      )}
    </div>
  );
}
