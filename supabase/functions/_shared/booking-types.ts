// Booking types for soft-reservation infrastructure
// All providers are DISABLED by default - this is scaffolding for future integrations

import type { ProviderPlace } from './places-types.ts';

export interface BookingInsights {
  reservationRecommended: boolean;
  reason: string;
  crowdLevel?: "low" | "medium" | "high";
  weekendBoost?: number;
  providerSource?: "mock" | "google" | "yelp" | "resy" | "opentable" | "foursquare" | null;
  bookingUrl?: string | null;
  phoneNumber?: string | null; // For "call to reserve"
}

export interface BookingProvider {
  readonly name: string;
  readonly isEnabled: boolean;
  /**
   * Given a merged ProviderPlace, return a booking URL if we know how
   * to route this venue to a booking partner. For now this is stubbed.
   */
  findBookingUrl(place: ProviderPlace): string | null;
}
