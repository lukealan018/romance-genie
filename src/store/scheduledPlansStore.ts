import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';

export interface ScheduledPlan {
  id: string;
  user_id: string;
  scheduled_date: string;
  scheduled_time: string;
  restaurant_id: string;
  restaurant_name: string;
  restaurant_address?: string;
  restaurant_cuisine?: string;
  restaurant_lat?: number;
  restaurant_lng?: number;
  restaurant_hours?: any;
  restaurant_website?: string;
  activity_id: string;
  activity_name: string;
  activity_address?: string;
  activity_category?: string;
  activity_lat?: number;
  activity_lng?: number;
  activity_hours?: any;
  activity_website?: string;
  weather_forecast?: any;
  confirmation_numbers?: any;
  availability_status?: string;
  conflict_warnings?: any;
  search_params?: any;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

interface ScheduledPlansState {
  scheduledPlans: ScheduledPlan[];
  isLoading: boolean;
  fetchScheduledPlans: () => Promise<void>;
  addScheduledPlan: (plan: Omit<ScheduledPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<ScheduledPlan | null>;
  updateScheduledPlan: (id: string, updates: Partial<ScheduledPlan>) => Promise<void>;
  deleteScheduledPlan: (id: string) => Promise<void>;
}

export const useScheduledPlansStore = create<ScheduledPlansState>((set, get) => ({
  scheduledPlans: [],
  isLoading: false,

  fetchScheduledPlans: async () => {
    set({ isLoading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('scheduled_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (error) throw error;

      set({ scheduledPlans: (data || []) as ScheduledPlan[] });
    } catch (error) {
      console.error('Error fetching scheduled plans:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addScheduledPlan: async (plan) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('scheduled_plans')
        .insert({
          ...plan,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      set((state) => ({
        ...state,
        scheduledPlans: [...state.scheduledPlans, data as ScheduledPlan].sort((a, b) => {
          const dateCompare = a.scheduled_date.localeCompare(b.scheduled_date);
          if (dateCompare !== 0) return dateCompare;
          return a.scheduled_time.localeCompare(b.scheduled_time);
        }),
      }));

      return data;
    } catch (error) {
      console.error('Error adding scheduled plan:', error);
      return null;
    }
  },

  updateScheduledPlan: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('scheduled_plans')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        scheduledPlans: state.scheduledPlans.map((plan) =>
          plan.id === id ? { ...plan, ...updates } : plan
        ),
      }));
    } catch (error) {
      console.error('Error updating scheduled plan:', error);
    }
  },

  deleteScheduledPlan: async (id) => {
    try {
      const { error } = await supabase
        .from('scheduled_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set((state) => ({
        scheduledPlans: state.scheduledPlans.filter((plan) => plan.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting scheduled plan:', error);
    }
  },
}));
