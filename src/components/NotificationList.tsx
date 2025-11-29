import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Calendar, Car, Heart, Cloud, ClipboardCheck } from 'lucide-react';
import { RatingModal } from './RatingModal';
import { AddConfirmationModal } from './AddConfirmationModal';

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  scheduled_for: string;
  sent_at: string | null;
  read_at: string | null;
  scheduled_plan_id: string;
}

export const NotificationList = ({ onClose }: { onClose: () => void }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [selectedPlanForRating, setSelectedPlanForRating] = useState<string | null>(null);
  const [selectedPlanForConfirmation, setSelectedPlanForConfirmation] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('notifications-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications'
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotifications = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .not('sent_at', 'is', null)
      .order('sent_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    setNotifications(data || []);
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    fetchNotifications();
  };

  const markAllAsRead = async () => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    fetchNotifications();
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    if (notification.notification_type === 'post_date') {
      setSelectedPlanForRating(notification.scheduled_plan_id);
    } else if (notification.notification_type === 'confirmation_reminder') {
      setSelectedPlanForConfirmation(notification.scheduled_plan_id);
    } else {
      navigate('/calendar');
      onClose();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'pre_date_2day':
      case 'day_of_morning':
        return <Calendar className="h-5 w-5 text-primary" />;
      case '2hrs_before':
        return <Car className="h-5 w-5 text-accent" />;
      case 'post_date':
        return <Heart className="h-5 w-5 text-destructive" />;
      case 'weather_alert':
        return <Cloud className="h-5 w-5 text-muted-foreground" />;
      case 'confirmation_reminder':
        return <ClipboardCheck className="h-5 w-5 text-secondary" />;
      default:
        return <Calendar className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Notifications</h3>
          {notifications.some(n => !n.read_at) && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="h-96">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full p-4 text-left hover:bg-accent transition-colors ${
                  !notification.read_at ? 'bg-accent/50' : ''
                }`}
              >
                <div className="flex gap-3">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm">{notification.title}</p>
                      {!notification.read_at && (
                        <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {notification.sent_at && formatDistanceToNow(new Date(notification.sent_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>

      {selectedPlanForRating && (
        <RatingModal
          planId={selectedPlanForRating}
          onClose={() => {
            setSelectedPlanForRating(null);
            onClose();
          }}
        />
      )}

      {selectedPlanForConfirmation && (
        <AddConfirmationModal
          planId={selectedPlanForConfirmation}
          onClose={() => {
            setSelectedPlanForConfirmation(null);
            onClose();
          }}
        />
      )}
    </>
  );
};
