// Estimate travel time based on distance
export const estimateTravelTime = (miles: number) => {
  const minutes = Math.round(miles * 2);
  if (minutes < 60) {
    return `${minutes} min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMins = minutes % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }
};

// Concierge-style rating labels (no raw numbers)
export const getConciergeRatingLabel = (rating: number, totalRatings: number): string => {
  if (rating >= 4.7 && totalRatings >= 500) return "Exceptional";
  if (rating >= 4.7) return "Highly Rated";
  if (rating >= 4.3 && totalRatings >= 200) return "Local Favorite";
  if (rating >= 4.3) return "Well Loved";
  if (rating >= 4.0) return "Great Pick";
  if (rating >= 3.5) return "Solid Choice";
  return "Worth a Try";
};

// Generate a one-line "why this place" tagline from existing data
export const getVenueTagline = (place: { isHiddenGem?: boolean; isLocalFavorite?: boolean; priceLevel?: string; rating: number; totalRatings: number; category?: string }, type: 'restaurant' | 'activity'): string => {
  if (place.isHiddenGem) return "A rare find most people don't know about";
  if (place.isLocalFavorite) return "A neighborhood staple locals swear by";
  
  if (type === 'restaurant') {
    if (place.priceLevel === '$$$$') return "Upscale dining for a special evening";
    if (place.priceLevel === '$$$' && place.rating >= 4.5) return "Refined dining with outstanding reviews";
    if (place.rating >= 4.7 && place.totalRatings >= 300) return "One of the highest-rated spots nearby";
    if (place.rating >= 4.5) return "Consistently impressive dining experience";
    return "A solid pick for tonight";
  }
  
  if (place.category === 'event') return "A live experience happening near you";
  if (place.rating >= 4.7 && place.totalRatings >= 200) return "A top-rated experience in the area";
  if (place.rating >= 4.5) return "Highly recommended by visitors";
  return "Something fun to round out your evening";
};
