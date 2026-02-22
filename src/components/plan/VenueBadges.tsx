import { Ticket } from "lucide-react";

interface VenueBadgesProps {
  isHiddenGem?: boolean;
  isNewDiscovery?: boolean;
  isLocalFavorite?: boolean;
  isLiveEvent?: boolean;
}

export const VenueBadges = ({ isHiddenGem, isNewDiscovery, isLocalFavorite, isLiveEvent }: VenueBadgesProps) => {
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {isLiveEvent && (
        <span 
          className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
          style={{
            background: 'hsl(var(--destructive) / 0.2)',
            color: 'hsl(var(--destructive))',
            border: '1px solid hsl(var(--destructive) / 0.3)',
          }}
        >
          <Ticket className="w-3 h-3" />
          Live Event
        </span>
      )}
      {isHiddenGem && (
        <span 
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            background: 'hsl(var(--accent) / 0.2)',
            color: 'hsl(var(--accent-foreground))',
            border: '1px solid hsl(var(--accent) / 0.3)',
          }}
        >
          💎 Hidden Gem
        </span>
      )}
      {isNewDiscovery && !isHiddenGem && (
        <span 
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            background: 'hsl(var(--primary) / 0.2)',
            color: 'hsl(var(--primary))',
            border: '1px solid hsl(var(--primary) / 0.3)',
          }}
        >
          🆕 New Discovery
        </span>
      )}
      {isLocalFavorite && !isHiddenGem && (
        <span 
          className="text-xs px-2 py-0.5 rounded-full"
          style={{
            background: 'hsl(var(--secondary) / 0.2)',
            color: 'hsl(var(--secondary-foreground))',
            border: '1px solid hsl(var(--secondary) / 0.3)',
          }}
        >
          🏆 Local Favorite
        </span>
      )}
    </div>
  );
};
