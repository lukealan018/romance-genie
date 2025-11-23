import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Star, Trash2, ArrowLeft, Calendar, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SavedPlan {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_cuisine: string;
  activity_id: string;
  activity_name: string;
  activity_category: string;
  created_at: string;
  was_completed: boolean;
  search_params: any;
}

export default function History() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);

  useEffect(() => {
    fetchSavedPlans();
  }, []);

  const fetchSavedPlans = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('saved_plans')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching saved plans:', error);
      toast({
        title: "Error",
        description: "Failed to load saved plans",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (planId: string) => {
    try {
      const { error } = await supabase
        .from('saved_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;

      setPlans(plans.filter(p => p.id !== planId));
      toast({
        title: "Plan deleted",
        description: "Successfully removed saved plan",
      });
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast({
        title: "Error",
        description: "Failed to delete plan",
        variant: "destructive"
      });
    }
    setDeleteDialogOpen(false);
    setPlanToDelete(null);
  };

  const handleToggleCompleted = async (planId: string, currentStatus: boolean) => {
    setUpdatingPlan(planId);
    try {
      const { error } = await supabase
        .from('saved_plans')
        .update({ was_completed: !currentStatus })
        .eq('id', planId);

      if (error) throw error;

      setPlans(plans.map(p => 
        p.id === planId ? { ...p, was_completed: !currentStatus } : p
      ));
      
      toast({
        title: currentStatus ? "Marked as upcoming" : "Marked as completed",
        description: currentStatus ? "Moved to upcoming plans" : "Great! Hope you had fun!",
      });
    } catch (error) {
      console.error('Error updating plan:', error);
      toast({
        title: "Error",
        description: "Failed to update plan status",
        variant: "destructive"
      });
    } finally {
      setUpdatingPlan(null);
    }
  };

  const upcomingPlans = plans.filter(p => !p.was_completed);
  const completedPlans = plans.filter(p => p.was_completed);

  const renderPlanCard = (plan: SavedPlan) => (
    <Card key={plan.id} className="group hover:shadow-lg transition-shadow border-2 border-primary/10 hover:border-primary/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {plan.was_completed && (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )}
              {new Date(plan.created_at).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </CardTitle>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleToggleCompleted(plan.id, plan.was_completed)}
              disabled={updatingPlan === plan.id}
            >
              {updatingPlan === plan.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : plan.was_completed ? (
                <Calendar className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setPlanToDelete(plan.id);
                setDeleteDialogOpen(true);
              }}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Restaurant */}
        <div className="space-y-2 p-4 rounded-lg bg-gradient-to-br from-primary/5 to-transparent border border-primary/20">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Restaurant
            </span>
          </div>
          <h3 className="font-bold text-xl text-foreground">{plan.restaurant_name}</h3>
          {plan.restaurant_cuisine && (
            <p className="text-sm text-muted-foreground">{plan.restaurant_cuisine}</p>
          )}
        </div>

        {/* Activity */}
        <div className="space-y-2 p-4 rounded-lg bg-gradient-to-br from-secondary/5 to-transparent border border-secondary/20">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-secondary" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Activity
            </span>
          </div>
          <h3 className="font-bold text-xl text-foreground">{plan.activity_name}</h3>
          {plan.activity_category && (
            <p className="text-sm text-muted-foreground capitalize">{plan.activity_category}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-primary to-primary/70 bg-clip-text text-transparent">
                Saved Plans
              </h1>
              <p className="text-muted-foreground mt-1">
                Your date night history and favorites
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-4">
            <TabsTrigger value="all">
              All ({plans.length})
            </TabsTrigger>
            <TabsTrigger value="upcoming">
              Upcoming ({upcomingPlans.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completedPlans.length})
            </TabsTrigger>
            <TabsTrigger value="scheduled" onClick={() => navigate('/calendar')}>
              Scheduled
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {plans.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">No saved plans yet</p>
                <Button onClick={() => navigate('/')}>
                  Create Your First Plan
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {plans.map(renderPlanCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingPlans.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground mb-4">No upcoming plans</p>
                <Button onClick={() => navigate('/')}>
                  Create a New Plan
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingPlans.map(renderPlanCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {completedPlans.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No completed plans yet</p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {completedPlans.map(renderPlanCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your saved plan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => planToDelete && handleDelete(planToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
