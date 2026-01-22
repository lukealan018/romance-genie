import type { ProviderActivity } from './activities-types.ts';

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

// Check if two activities are likely duplicates (same name + within 50 meters)
function isNearbyDuplicate(a: ProviderActivity, b: ProviderActivity): boolean {
  // Fuzzy name match - check if names overlap significantly
  const nameA = a.name.toLowerCase().trim();
  const nameB = b.name.toLowerCase().trim();
  
  // Exact match
  if (nameA === nameB) {
    const distance = calculateDistance(a.lat, a.lng, b.lat, b.lng);
    return distance < 0.03; // ~50 meters
  }
  
  // One name contains the other (handles variations like "Joe's Bar" vs "Joe's")
  const nameMatch = nameA.includes(nameB.slice(0, Math.min(10, nameB.length))) || 
                    nameB.includes(nameA.slice(0, Math.min(10, nameA.length)));
  
  if (nameMatch) {
    const distance = calculateDistance(a.lat, a.lng, b.lat, b.lng);
    return distance < 0.03; // ~50 meters
  }
  
  return false;
}

// Replace existing activity with better result if it has more reviews or higher rating
function maybeReplaceWithBetterResult(unique: ProviderActivity[], newActivity: ProviderActivity): void {
  const existingIndex = unique.findIndex(existing => isNearbyDuplicate(existing, newActivity));
  
  if (existingIndex !== -1) {
    const existing = unique[existingIndex];
    
    // Keep the one with more reviews, or if tied, higher rating
    if (newActivity.totalRatings > existing.totalRatings || 
        (newActivity.totalRatings === existing.totalRatings && newActivity.rating > existing.rating)) {
      console.log(`🔄 Replacing ${existing.name} (${existing.source}) with ${newActivity.name} (${newActivity.source})`);
      unique[existingIndex] = newActivity;
    }
  }
}

export function mergeAndDedupeActivities(resultArrays: ProviderActivity[][]): ProviderActivity[] {
  const allActivities = resultArrays.flat();
  const unique: ProviderActivity[] = [];
  
  console.log(`📦 Merging ${allActivities.length} total results from ${resultArrays.length} providers`);
  
  for (const activity of allActivities) {
    const isDuplicate = unique.some(existing => isNearbyDuplicate(existing, activity));
    
    if (!isDuplicate) {
      unique.push(activity);
    } else {
      // Try to replace with better result
      maybeReplaceWithBetterResult(unique, activity);
    }
  }
  
  console.log(`✅ Deduped to ${unique.length} unique activities`);
  
  // Return without sorting - let search function handle final order based on intent
  return unique;
}
