import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from './ui/use-toast';

interface AddConfirmationModalProps {
  planId: string;
  onClose: () => void;
}

export const AddConfirmationModal = ({ planId, onClose }: AddConfirmationModalProps) => {
  const [restaurantConfirmation, setRestaurantConfirmation] = useState('');
  const [activityConfirmation, setActivityConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [restaurantName, setRestaurantName] = useState('');
  const [activityName, setActivityName] = useState('');

  useEffect(() => {
    fetchPlanDetails();
  }, [planId]);

  const fetchPlanDetails = async () => {
    const { data, error } = await supabase
      .from('scheduled_plans')
      .select('restaurant_name, activity_name, confirmation_numbers')
      .eq('id', planId)
      .single();

    if (error) {
      console.error('Error fetching plan:', error);
      return;
    }

    setRestaurantName(data.restaurant_name);
    setActivityName(data.activity_name);

    if (data.confirmation_numbers && typeof data.confirmation_numbers === 'object') {
      const confirmations = data.confirmation_numbers as { restaurant?: string; activity?: string };
      setRestaurantConfirmation(confirmations.restaurant || '');
      setActivityConfirmation(confirmations.activity || '');
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);

    try {
      const confirmationNumbers = {
        restaurant: restaurantConfirmation.trim() || null,
        activity: activityConfirmation.trim() || null
      };

      const { error } = await supabase
        .from('scheduled_plans')
        .update({ confirmation_numbers: confirmationNumbers })
        .eq('id', planId);

      if (error) throw error;

      toast({
        title: 'Confirmations saved! ✓',
        description: 'Your reservation details have been updated.'
      });

      onClose();
    } catch (error) {
      console.error('Error saving confirmations:', error);
      toast({
        title: 'Error saving confirmations',
        description: 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl">
            Add Confirmation Numbers 📝
          </DialogTitle>
          <DialogDescription className="text-base">
            Track your reservations for a better experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Restaurant Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="restaurant-confirmation">
              {restaurantName} Confirmation
            </Label>
            <Input
              id="restaurant-confirmation"
              value={restaurantConfirmation}
              onChange={(e) => setRestaurantConfirmation(e.target.value)}
              placeholder="Enter confirmation number"
              className="h-12"
            />
          </div>

          {/* Activity Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="activity-confirmation">
              {activityName} Confirmation
            </Label>
            <Input
              id="activity-confirmation"
              value={activityConfirmation}
              onChange={(e) => setActivityConfirmation(e.target.value)}
              placeholder="Enter confirmation number"
              className="h-12"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="flex-1 h-12"
              disabled={isSubmitting}
            >
              Skip for Now
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 h-12 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
