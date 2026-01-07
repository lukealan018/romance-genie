import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Star, DollarSign, ExternalLink } from 'lucide-react';

interface PlaceDetails {
  id: string;
  name: string;
  address?: string;
  cuisine?: string;
  category?: string;
  rating?: number;
  priceLevel?: string;
  photoUrl?: string;
  website?: string;
  hours?: Record<string, string>;
}

interface InvitePlanCardProps {
  type: 'restaurant' | 'activity';
  place: PlaceDetails;
  delay?: number;
}

const InvitePlanCard: React.FC<InvitePlanCardProps> = ({
  type,
  place,
  delay = 0,
}) => {
  const typeLabel = type === 'restaurant' ? 'Dinner' : 'Activity';
  const typeEmoji = type === 'restaurant' ? '🍽️' : '🎯';

  const renderPriceLevel = (priceLevel?: string) => {
    if (!priceLevel) return null;
    const count = priceLevel === '$' ? 1 : priceLevel === '$$' ? 2 : priceLevel === '$$$' ? 3 : 4;
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: count }).map((_, i) => (
          <DollarSign key={i} className="w-3 h-3 text-primary" />
        ))}
        {Array.from({ length: 4 - count }).map((_, i) => (
          <DollarSign key={i} className="w-3 h-3 text-muted-foreground/30" />
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 shadow-lg"
    >
      {/* Header with type label */}
      <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{typeEmoji}</span>
          <span className="text-sm font-medium text-muted-foreground">{typeLabel}</span>
        </div>
        {place.rating && (
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            <span className="text-foreground font-medium">{place.rating}</span>
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="p-4">
        {/* Photo if available */}
        {place.photoUrl && (
          <div className="relative h-32 rounded-xl overflow-hidden mb-4">
            <img
              src={place.photoUrl}
              alt={place.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        )}

        {/* Place name */}
        <h3 className="text-xl font-bold text-foreground mb-2">{place.name}</h3>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {(place.cuisine || place.category) && (
            <span className="px-2 py-1 text-xs rounded-full bg-primary/20 text-primary">
              {place.cuisine || place.category}
            </span>
          )}
          {renderPriceLevel(place.priceLevel)}
        </div>

        {/* Address */}
        {place.address && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground mb-2">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
            <span className="line-clamp-2">{place.address}</span>
          </div>
        )}

        {/* Website link */}
        {place.website && (
          <a
            href={place.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-2"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View Details
          </a>
        )}
      </div>

      {/* Decorative glow */}
      <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
    </motion.div>
  );
};

export default InvitePlanCard;
