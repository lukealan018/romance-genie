import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScheduledPlansStore } from "@/store/scheduledPlansStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Calendar as CalendarIcon, MapPin, Clock, Cloud, Trash2, Share2, MessageSquare } from "lucide-react";
import { ExportCalendarButton } from "@/components/ExportCalendarButton";
import { ConflictWarningCard } from "@/components/ConflictWarningCard";
import { AvailabilityBadge } from "@/components/AvailabilityBadge";
import { SharePlanDialog } from "@/components/SharePlanDialog";
import { ViewResponsesDrawer } from "@/components/ViewResponsesDrawer";
import { getMapUrl, yelpSearchUrl } from "@/lib/external-links";
import { toast } from "sonner";

// Parse date string without timezone issues
const parseDateString = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function Calendar() {
  const navigate = useNavigate();
  const { scheduledPlans, isLoading, fetchScheduledPlans, deleteScheduledPlan } = useScheduledPlansStore();
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [shareDialogPlan, setShareDialogPlan] = useState<typeof scheduledPlans[0] | null>(null);
  const [responsesDrawerPlan, setResponsesDrawerPlan] = useState<typeof scheduledPlans[0] | null>(null);

  useEffect(() => {
    fetchScheduledPlans();
  }, [fetchScheduledPlans]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredPlans = scheduledPlans.filter(plan => {
    const planDate = parseDateString(plan.scheduled_date);
    planDate.setHours(0, 0, 0, 0);
    return filter === 'upcoming' ? planDate >= today : planDate < today;
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
                          </div>
                          <div className="flex items-center gap-2 text-lg font-medium">
                            <Clock className="w-5 h-5" />
                            {plan.scheduled_time}
                          </div>
                        </div>
                        <div className="flex gap-2">
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
    </div>
  );
}
