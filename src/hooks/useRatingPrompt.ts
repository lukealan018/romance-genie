import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PlanToRate {
  id: string;
  restaurant_name: string;
  activity_name: string;
  scheduled_date: string;
  scheduled_time: string;
}

export const useRatingPrompt = () => {
  const [planToRate, setPlanToRate] = useState<PlanToRate | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkForCompletedPlans = async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user?.id) return;

        const now = new Date();
        const todayDate = now.toISOString().split('T')[0];
        const currentTime = now.toTimeString().slice(0, 5);

        // Find plans that have passed but haven't been rated
        const { data: unratedPlans } = await supabase
          .from('scheduled_plans')
          .select('id, restaurant_name, activity_name, scheduled_date, scheduled_time')
          .eq('user_id', session.session.user.id)
          .is('rating', null)
          .is('completed_at', null)
          .or(`scheduled_date.lt.${todayDate},and(scheduled_date.eq.${todayDate},scheduled_time.lt.${currentTime})`)
          .order('scheduled_date', { ascending: false })
          .limit(1);

        if (unratedPlans && unratedPlans.length > 0) {
          setPlanToRate(unratedPlans[0]);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Error checking for completed plans:', error);
      }
    };

    // Check on mount and after a delay
    const timer = setTimeout(checkForCompletedPlans, 2000);
    return () => clearTimeout(timer);
  }, []);

  const closeRatingModal = () => {
    setIsOpen(false);
    setPlanToRate(null);
  };

  return {
    planToRate,
    isOpen,
    closeRatingModal,
  };
};
