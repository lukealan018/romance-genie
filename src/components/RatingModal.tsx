import { useState } from 'react';
import { Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from './ui/use-toast';

interface RatingModalProps {
  planId: string;
  onClose: () => void;
}

export const RatingModal = ({ planId, onClose }: RatingModalProps) => {
  const [rating, setRating] = useState<number>(0);
  const [hoveredRating, setHoveredRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: 'Please select a rating',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Update the scheduled plan with rating
      const { error } = await supabase
        .from('scheduled_plans')
        .update({
          rating,
          completed_at: new Date().toISOString()
        })
        .eq('id', planId);

      if (error) throw error;

      // Also record in user_interactions for the learning algorithm
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id) {
        // Fetch the plan details to record the interaction
        const { data: plan } = await supabase
          .from('scheduled_plans')
          .select('restaurant_id, restaurant_name, restaurant_cuisine, activity_id, activity_name, activity_category')
          .eq('id', planId)
          .single();

        if (plan) {
          // Record restaurant rating
          await supabase.from('user_interactions').insert({
            user_id: sessionData.session.user.id,
            place_id: plan.restaurant_id,
            place_name: plan.restaurant_name,
            place_type: 'restaurant',
            interaction_type: 'rate',
            cuisine: plan.restaurant_cuisine,
            rating: rating,
          });

          // Record activity rating
          await supabase.from('user_interactions').insert({
            user_id: sessionData.session.user.id,
            place_id: plan.activity_id,
            place_name: plan.activity_name,
            place_type: 'activity',
            interaction_type: 'rate',
            category: plan.activity_category,
            rating: rating,
          });
        }
      }

      toast({
        title: 'Thanks for the feedback! 🎉',
        description: 'Your rating helps improve recommendations.'
      });

      onClose();
    } catch (error) {
      console.error('Error saving rating:', error);
      toast({
        title: 'Error saving rating',
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
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            How Was Your Date? 💕
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className={`h-10 w-10 ${
                    star <= (hoveredRating || rating)
                      ? 'fill-primary text-primary'
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Optional Feedback */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">
              What did you love? (optional)
            </label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Tell us about your experience..."
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="flex-1"
              disabled={isSubmitting}
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              disabled={isSubmitting || rating === 0}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
