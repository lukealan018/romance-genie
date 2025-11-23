import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScheduledPlansStore } from "@/store/scheduledPlansStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, Calendar as CalendarIcon, MapPin, Clock, Cloud, Trash2 } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ExportCalendarButton } from "@/components/ExportCalendarButton";
import { ConflictWarningCard } from "@/components/ConflictWarningCard";
import { toast } from "sonner";

export default function Calendar() {
  const navigate = useNavigate();
  const { scheduledPlans, isLoading, fetchScheduledPlans, deleteScheduledPlan } = useScheduledPlansStore();
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    fetchScheduledPlans();
  }, [fetchScheduledPlans]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredPlans = scheduledPlans.filter(plan => {
    const planDate = new Date(plan.scheduled_date);
    planDate.setHours(0, 0, 0, 0);
    return filter === 'upcoming' ? planDate >= today : planDate < today;
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('Cancel this scheduled date?')) {
      await deleteScheduledPlan(id);
      toast.success('Date cancelled');
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
              <h1 className="text-3xl font-bold">Calendar</h1>
              <p className="text-sm text-muted-foreground">Your scheduled date nights</p>
            </div>
          </div>
          <ThemeToggle />
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
                        <div>
                          <div className="flex items-center gap-2 text-2xl font-bold">
                            <CalendarIcon className="w-6 h-6" />
                            {new Date(plan.scheduled_date).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {plan.scheduled_time}
                          </div>
                        </div>
                        <div className="flex gap-2">
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

                      {plan.weather_forecast && (
                        <div className="flex items-center gap-2 text-sm">
                          <Cloud className="w-4 h-4" />
                          <span>{plan.weather_forecast.temp}°F</span>
                          <span className="text-muted-foreground">{plan.weather_forecast.description}</span>
                        </div>
                      )}

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm font-semibold text-muted-foreground">🍽️ Restaurant</div>
                          <div>
                            <div className="font-medium">{plan.restaurant_name}</div>
                            {plan.restaurant_cuisine && (
                              <div className="text-sm text-muted-foreground">{plan.restaurant_cuisine}</div>
                            )}
                            {plan.restaurant_address && (
                              <div className="flex items-start gap-1 text-sm text-muted-foreground mt-1">
                                <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
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
                            <div className="font-medium">{plan.activity_name}</div>
                            {plan.activity_category && (
                              <div className="text-sm text-muted-foreground">{plan.activity_category}</div>
                            )}
                            {plan.activity_address && (
                              <div className="flex items-start gap-1 text-sm text-muted-foreground mt-1">
                                <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
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
    </div>
  );
}
