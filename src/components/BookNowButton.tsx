import { ExternalLink, Calendar } from 'lucide-react';
import { Button } from './ui/button';
import { trackActivity } from '@/lib/activity-tracker';

interface BookNowButtonProps {
  type: 'restaurant' | 'activity';
  name: string;
  city?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  category?: 'event' | 'activity';
}

export const BookNowButton = ({
  type,
  name,
  city,
  lat,
  lng,
  placeId,
  category = 'activity',
}: BookNowButtonProps) => {
  
  const handleBookNow = () => {
    // Track the booking click
    trackActivity({
      action_type: 'booking_click',
      ...(type === 'restaurant' 
        ? { restaurant_id: placeId, restaurant_name: name }
        : { activity_id: placeId, activity_name: name, activity_category: category }
      ),
    });

    // Generate the appropriate booking URL
    let url: string;
    
    if (type === 'restaurant') {
      // OpenTable is the most universal for restaurants
      const params = new URLSearchParams();
      params.set('term', [name, city].filter(Boolean).join(' '));
      url = `https://www.opentable.com/s?${params.toString()}`;
    } else {
      // For activities, use Google Maps or Yelp
      if (category === 'event') {
        // Eventbrite for events
        url = `https://www.eventbrite.com/d/${city ? encodeURIComponent(city) : 'online'}--events/${encodeURIComponent(name)}/`;
      } else {
        // Yelp for general activities
        const params = new URLSearchParams();
        params.set('find_desc', name);
        if (city) params.set('find_loc', city);
        url = `https://www.yelp.com/search?${params.toString()}`;
      }
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button 
      onClick={handleBookNow}
      size="sm"
      className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
    >
      {type === 'restaurant' ? (
        <>
          <Calendar className="w-4 h-4" />
          Reserve
        </>
      ) : (
        <>
          <ExternalLink className="w-4 h-4" />
          Book Now
        </>
      )}
    </Button>
  );
};
