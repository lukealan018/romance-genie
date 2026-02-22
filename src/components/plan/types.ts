export interface Place {
  id: string;
  name: string;
  rating: number;
  totalRatings: number;
  address: string;
  lat: number;
  lng: number;
  priceLevel?: string;
  cuisine?: string;
  city?: string;
  category?: 'event' | 'activity';
  source?: string;
  isHiddenGem?: boolean;
  isNewDiscovery?: boolean;
  isLocalFavorite?: boolean;
  ticketUrl?: string;
  eventDate?: string;
  eventTime?: string;
  priceMin?: number;
  priceMax?: number;
  imageUrl?: string;
  venueName?: string;
}

export interface PlanDistances {
  toRestaurant: number;
  toActivity: number;
  betweenPlaces: number;
}

export interface UserReservationPrefs {
  date?: Date;
  time?: Date;
  partySize?: number;
}
