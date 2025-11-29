// Booking insights module - heuristic-based reservation recommendations
// Pure, testable function using only existing ProviderPlace fields

import type { ProviderPlace } from './places-types.ts';
import type { BookingInsights } from './booking-types.ts';

/**
 * Build booking insights for a venue using heuristics based on
 * price level, rating, review count, and scheduled date/time.
 * 
 * This is a pure function with no side effects - suitable for testing.
 */
export function buildBookingInsights(
  place: ProviderPlace,
  scheduledDateTime?: Date
): BookingInsights {
  let reservationRecommended = false;
  let reason = "Walk-ins usually okay";
  let crowdLevel: "low" | "medium" | "high" = "low";
  let weekendBoost = 0;

  // Heuristic 1: Higher-end + well-rated restaurants
  // Price level 3+ ($$$ or $$$$) AND rating 4.3+
  if ((place.priceLevel ?? 0) >= 3 && place.rating >= 4.3) {
    reservationRecommended = true;
    reason = "Popular higher-end spot — reservations recommended";
    crowdLevel = "medium";
  }

  // Heuristic 2: Very popular restaurants (lots of reviews + high rating)
  // Rating 4.5+ AND 500+ reviews
  if (place.rating >= 4.5 && place.reviewCount > 500) {
    reservationRecommended = true;
    reason = "Very popular — books up fast";
    crowdLevel = "high";
  }

  // Heuristic 3: Weekend dinner hours (Fri/Sat 6-9pm)
  if (scheduledDateTime) {
    const day = scheduledDateTime.getDay();
    const hour = scheduledDateTime.getHours();
    
    const isWeekend = day === 5 || day === 6; // Friday = 5, Saturday = 6
    const isDinnerTime = hour >= 18 && hour <= 21; // 6pm - 9pm
    
    if (isWeekend && isDinnerTime) {
      weekendBoost = 0.3;
      crowdLevel = "high";
      
      // Push toward reservation if weekend dinner
      if (!reservationRecommended && place.rating >= 4.0) {
        reservationRecommended = true;
        reason = "Weekend dinner rush — reservations recommended";
      }
    } else if (isWeekend) {
      weekendBoost = 0.15;
      if (crowdLevel === "low") crowdLevel = "medium";
    }
  }

  // Heuristic 4: Extremely high review count (viral/famous spots)
  if (place.reviewCount > 2000) {
    reservationRecommended = true;
    reason = "Extremely popular destination — book ahead";
    crowdLevel = "high";
  }

  return {
    reservationRecommended,
    reason,
    crowdLevel,
    weekendBoost: weekendBoost > 0 ? weekendBoost : undefined,
    providerSource: place.source || null,
    bookingUrl: null, // Will be populated by booking providers when enabled
    phoneNumber: null, // Will be populated from place details when available
  };
}
