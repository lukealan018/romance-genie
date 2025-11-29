// Feature flags for controlling provider enablement and features
// Separate from hardcoded isEnabled flags for flexible rollout

const IS_PRODUCTION = Deno.env.get("ENVIRONMENT") === "production";

export const FEATURE_FLAGS = {
  // Search Providers (restaurants)
  ENABLE_GOOGLE: true,      // ✅ ACTIVE
  ENABLE_FOURSQUARE: true,  // ✅ ACTIVE
  ENABLE_YELP: false,       // ⏸️ READY (disabled)
  
  // Activity Providers
  ENABLE_TICKETMASTER: false,   // ⏸️ READY (disabled)
  ENABLE_EVENTBRITE: false,     // ⏸️ READY (disabled)
  ENABLE_YELP_ACTIVITIES: false, // ⏸️ READY (disabled)
  
  // Booking Providers
  ENABLE_RESY: false,              // ⏸️ READY (disabled)
  ENABLE_OPENTABLE: false,         // ⏸️ READY (disabled)
  ENABLE_YELP_RESERVATIONS: false, // ⏸️ READY (disabled)
  
  // Features
  ENABLE_BOOKING_INSIGHTS: false,  // ⏸️ READY (disabled)
  ENABLE_SMART_PROMPTS: false,     // ⏸️ READY (disabled)
  ENABLE_DEEP_LINKS: false,        // ⏸️ READY (disabled)
};

// Helper to check if a feature should be enabled
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag] === true;
}
