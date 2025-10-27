export function googleMapsUrl(name: string, lat?: number, lng?: number, address?: string) {
  if (lat != null && lng != null) {
    // Most precise - drops pin at exact coordinates
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  }
  if (address) {
    // Better than just name - uses full address
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  }
  // Fallback to name search
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
}

/** Multi-stop route for navigating between restaurant and activity */
export function googleMapsRouteUrl(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  travelMode: 'driving' | 'walking' | 'transit' = 'driving'
) {
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=${travelMode}`;
}

export function telHref(phone?: string | null) {
  if (!phone) return null;
  const clean = phone.replace(/[^+\d]/g, '');
  return clean ? `tel:${clean}` : null;
}

/** Generic OpenTable search (reliable). If you know city, include it. */
export function openTableSearchUrl(name: string, city?: string, dateISO?: string, time24?: string, partySize?: number) {
  const params = new URLSearchParams();
  params.set('term', [name, city].filter(Boolean).join(' '));
  if (partySize) params.set('covers', String(partySize));
  if (dateISO && time24) params.set('datetime', `${dateISO}T${time24}`);
  return `https://www.opentable.com/s?${params.toString()}`;
}

/** Resy public search—lands on results with the name/city prefilled */
export function resySearchUrl(name: string, city?: string, dateISO?: string, time24?: string, partySize?: number) {
  const params = new URLSearchParams();
  params.set('q', [name, city].filter(Boolean).join(' '));
  if (dateISO) params.set('date', dateISO);
  if (partySize) params.set('party_size', String(partySize));
  if (time24) params.set('time', time24);
  return `https://resy.com/cities/search?${params.toString()}`;
}

/** Yelp search - great for restaurants and local businesses */
export function yelpSearchUrl(name: string, location?: string) {
  const params = new URLSearchParams();
  params.set('find_desc', name);
  if (location) params.set('find_loc', location);
  return `https://www.yelp.com/search?${params.toString()}`;
}

/** Eventbrite search for local events and activities */
export function eventbriteSearchUrl(keyword: string, location?: string, dateISO?: string) {
  const params = new URLSearchParams();
  params.set('q', keyword);
  if (location) params.set('location', location);
  if (dateISO) params.set('start_date', dateISO);
  return `https://www.eventbrite.com/d/${location ? encodeURIComponent(location) : 'online'}--events/${encodeURIComponent(keyword)}/`;
}

/** Ticketmaster generic search with location support */
export function ticketmasterSearchUrl(keyword: string, lat?: number, lng?: number, radiusMiles = 15, dateISO?: string) {
  const params = new URLSearchParams();
  params.set('q', keyword);
  if (lat != null && lng != null) {
    params.set('lat', String(lat));
    params.set('lng', String(lng));
    params.set('radius', String(radiusMiles));
  }
  if (dateISO) params.set('startDateTime', `${dateISO}T00:00:00Z`);
  return `https://www.ticketmaster.com/search?${params.toString()}`;
}

/** Fever - curated experiences and immersive events */
export function feverSearchUrl(city: string, keyword?: string) {
  // Fever uses city-specific URLs - you may need to map cities to their slugs
  const citySlug = city.toLowerCase().replace(/\s+/g, '-');
  const base = `https://feverup.com/${citySlug}`;
  if (keyword) {
    return `${base}?q=${encodeURIComponent(keyword)}`;
  }
  return base;
}

/** Helper: Get all reservation links for a restaurant */
export function getReservationLinks(restaurant: {
  name: string;
  city?: string;
  lat?: number;
  lng?: number;
  address?: string;
}, preferences?: {
  date?: Date;
  time?: Date;
  partySize?: number;
}) {
  const dateISO = preferences?.date ? toISODate(preferences.date) : undefined;
  const time24 = preferences?.time ? toTime24(preferences.time) : undefined;
  
  return {
    openTable: openTableSearchUrl(restaurant.name, restaurant.city, dateISO, time24, preferences?.partySize),
    resy: resySearchUrl(restaurant.name, restaurant.city, dateISO, time24, preferences?.partySize),
    yelp: yelpSearchUrl(restaurant.name, restaurant.city),
    googleMaps: googleMapsUrl(restaurant.name, restaurant.lat, restaurant.lng, restaurant.address),
  };
}

/** Helper: Get all ticket/activity links for an event or activity */
export function getActivityLinks(activity: {
  name: string;
  city?: string;
  lat?: number;
  lng?: number;
  address?: string;
  category?: 'event' | 'activity'; // event = needs tickets, activity = walk-in
}, preferences?: {
  date?: Date;
}) {
  const dateISO = preferences?.date ? toISODate(preferences.date) : undefined;
  
  const links: any = {
    googleMaps: googleMapsUrl(activity.name, activity.lat, activity.lng, activity.address),
    yelp: yelpSearchUrl(activity.name, activity.city),
  };

  // Only add ticketing links for events (not walk-in activities)
  if (activity.category === 'event') {
    links.eventbrite = eventbriteSearchUrl(activity.name, activity.city, dateISO);
    links.ticketmaster = ticketmasterSearchUrl(activity.name, activity.lat, activity.lng, 15, dateISO);
    if (activity.city) {
      links.fever = feverSearchUrl(activity.city, activity.name);
    }
  }

  return links;
}

/** Helpers to format from profile */
export function toISODate(date: Date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function toTime24(date: Date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
