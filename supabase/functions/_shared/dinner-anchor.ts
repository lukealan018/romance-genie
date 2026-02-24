import type { ProviderPlace } from './places-types.ts';

export type DinnerAnchorReason =
  | 'hard_excluded_type'
  | 'hard_excluded_name'
  | 'rating_floor'
  | 'review_floor'
  | 'bistro_low_signal';

interface DinnerAnchorContext {
  explicitCasualRequest: boolean;
}

const HARD_EXCLUDED_TYPES = new Set([
  'coffee_shop',
  'cafe',
  'bakery',
  'dessert_shop',
  'deli',
  'fast_food',
  'meal_takeaway',
  'meal_delivery',
  'food_court',
  'convenience_store',
  'grocery_store',
]);

const DINNER_POSITIVE_TYPES = new Set([
  'restaurant',
  'steakhouse',
  'brasserie',
  'trattoria',
  'grill',
]);

const DINNER_HARD_EXCLUDED_NAME_REGEX = /coffee|café|cafe|bakery|dessert|deli|food\s*court|grocery|market|convenience/i;
const BISTRO_REGEX = /\bbistro\b/i;

const ITALIAN_REGEX = /italian|trattoria|ristorante|osteria|enoteca/i;
const SUSHI_REGEX = /sushi|omakase|izakaya/i;
const MODERN_AMERICAN_REGEX = /american|new\s+american|contemporary/i;

export function isEveningSearchWindow(searchTime?: string): boolean {
  if (!searchTime) return false;
  const [hRaw] = searchTime.split(':');
  const hour = Number(hRaw);
  if (Number.isNaN(hour)) return false;
  return hour >= 17 && hour <= 22;
}

export function isExplicitCasualRequest(cuisine: string, queryBundles: string[]): boolean {
  const joined = `${cuisine || ''} ${(queryBundles || []).join(' ')}`.toLowerCase();
  return /(coffee|cafe|café|bakery|dessert|deli|bistro|quick bite|fast food|casual)/i.test(joined);
}

export function isDinnerAnchorCandidate(
  place: ProviderPlace,
  context: DinnerAnchorContext
): { keep: boolean; reasons: DinnerAnchorReason[] } {
  const reasons: DinnerAnchorReason[] = [];

  const types = (place.types || place.categories || []).map((t) => t.toLowerCase());
  const hardTypeMatch = types.some((t) => HARD_EXCLUDED_TYPES.has(t));

  if (hardTypeMatch && !context.explicitCasualRequest) {
    reasons.push('hard_excluded_type');
  }

  if (DINNER_HARD_EXCLUDED_NAME_REGEX.test(place.name) && !context.explicitCasualRequest) {
    reasons.push('hard_excluded_name');
  }

  if ((place.rating || 0) < 3.8) {
    reasons.push('rating_floor');
  }

  if ((place.reviewCount || 0) < 25) {
    reasons.push('review_floor');
  }

  const isBistro = BISTRO_REGEX.test(place.name);
  const lowPrice = (place.priceLevel ?? 0) < 2;
  const lowReviews = (place.reviewCount || 0) < 120;
  if (isBistro && (lowPrice || lowReviews) && !context.explicitCasualRequest) {
    reasons.push('bistro_low_signal');
  }

  return { keep: reasons.length === 0, reasons };
}

export function dinnerAnchorScore(place: ProviderPlace, explicitCasualRequest: boolean): number {
  let score = 0;
  const types = (place.types || place.categories || []).map((t) => t.toLowerCase());
  const name = (place.name || '').toLowerCase();

  if ((place.priceLevel ?? 0) >= 2) score += 1.2;
  if ((place.reviewCount || 0) >= 200 && (place.reviewCount || 0) <= 1500) score += 1.2;
  else if ((place.reviewCount || 0) >= 80) score += 0.4;

  if ((place.rating || 0) >= 4.4) score += 1.2;
  else if ((place.rating || 0) >= 4.1) score += 0.5;

  if ((place.photos || []).length > 0) score += 0.8;

  if (types.some((t) => DINNER_POSITIVE_TYPES.has(t))) score += 1.0;

  // occasionScore: steakhouse > Italian > sushi > modern American > cafe/bistro
  if (name.includes('steakhouse') || types.includes('steakhouse')) score += 1.5;
  if (ITALIAN_REGEX.test(name) || types.some((t) => ITALIAN_REGEX.test(t))) score += 1.2;
  if (SUSHI_REGEX.test(name) || types.some((t) => SUSHI_REGEX.test(t))) score += 1.0;
  if (MODERN_AMERICAN_REGEX.test(name) || types.some((t) => MODERN_AMERICAN_REGEX.test(t))) score += 0.8;

  if (!explicitCasualRequest) {
    if (name.includes('cafe')) score -= 1.0;
    if (name.includes('bistro')) score -= 0.6;
  }

  return score;
}

export function getTopDinnerAnchorReasons(
  reasonCounts: Record<string, number>,
  limit = 5
): Array<{ reason: string; count: number }> {
  return Object.entries(reasonCounts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([reason, count]) => ({ reason, count }));
}
