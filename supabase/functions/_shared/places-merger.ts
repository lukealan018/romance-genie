import type { ProviderPlace } from './places-types.ts';

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Check if two places are likely duplicates (same name + within 50 meters)
function isNearbyDuplicate(a: ProviderPlace, b: ProviderPlace): boolean {
  // Fuzzy name match - check if names overlap significantly
  const nameA = a.name.toLowerCase().trim();
  const nameB = b.name.toLowerCase().trim();
  
  // Exact match
  if (nameA === nameB) {
    const distance = calculateDistance(a.lat, a.lng, b.lat, b.lng);
    return distance < 0.03; // ~50 meters
  }
  
  // One name contains the other (handles variations like "Joe's Pizza" vs "Joe's")
  const nameMatch = nameA.includes(nameB.slice(0, Math.min(10, nameB.length))) || 
                    nameB.includes(nameA.slice(0, Math.min(10, nameA.length)));
  
  if (nameMatch) {
    const distance = calculateDistance(a.lat, a.lng, b.lat, b.lng);
    return distance < 0.03; // ~50 meters
  }
  
  return false;
}

// Replace existing place with better result if it has more reviews or higher rating
function maybeReplaceWithBetterResult(unique: ProviderPlace[], newPlace: ProviderPlace): void {
  const existingIndex = unique.findIndex(existing => isNearbyDuplicate(existing, newPlace));
  
  if (existingIndex !== -1) {
    const existing = unique[existingIndex];
    
    // Keep the one with more reviews, or if tied, higher rating
    if (newPlace.reviewCount > existing.reviewCount || 
        (newPlace.reviewCount === existing.reviewCount && newPlace.rating > existing.rating)) {
      console.log(`🔄 Replacing ${existing.name} (${existing.source}) with ${newPlace.name} (${newPlace.source})`);
      unique[existingIndex] = newPlace;
    }
  }
}

export function mergeAndDedupeResults(resultArrays: ProviderPlace[][]): ProviderPlace[] {
  const allPlaces = resultArrays.flat();
  const unique: ProviderPlace[] = [];
  
  console.log(`📦 Merging ${allPlaces.length} total results from ${resultArrays.length} providers`);
  
  for (const place of allPlaces) {
    const isDuplicate = unique.some(existing => isNearbyDuplicate(existing, place));
    
    if (!isDuplicate) {
      unique.push(place);
    } else {
      // Try to replace with better result
      maybeReplaceWithBetterResult(unique, place);
    }
  }
  
  console.log(`✅ Deduped to ${unique.length} unique places`);
  
  // Sort by rating descending (highest first)
  return unique.sort((a, b) => b.rating - a.rating);
}
