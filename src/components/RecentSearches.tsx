import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface SavedPlan {
  id: string;
  restaurant_name: string;
  restaurant_cuisine: string | null;
  activity_name: string;
  activity_category: string | null;
  search_params: any;
  created_at: string;
}

interface RecentSearchesProps {
  userId: string;
  onSelectPlan: (plan: SavedPlan) => void;
}

export function RecentSearches({ userId, onSelectPlan }: RecentSearchesProps) {
  const [recentPlans, setRecentPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecentPlans();
  }, [userId]);

  const loadRecentPlans = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('saved_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3);
    
    setRecentPlans(data || []);
    setLoading(false);
  };

  if (loading || recentPlans.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">Recent Favorites 💫</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentPlans.map(plan => (
          <div key={plan.id} className="flex justify-between items-center gap-4 p-3 rounded-lg bg-muted/50">
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{plan.restaurant_name}</p>
              <p className="text-sm text-muted-foreground truncate">
                + {plan.activity_name}
              </p>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onSelectPlan(plan)}
              className="shrink-0"
            >
              Do Again
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
