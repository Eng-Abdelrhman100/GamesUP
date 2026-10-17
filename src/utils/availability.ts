// ASK 01: single source of truth for storefront availability.
// A product is purchasable only with valid pricing (>0) AND purchasable inventory (>0).
// Out-of-stock + zero-priced products are dead listings: hidden from sales listings,
// blocked on detail/cart/checkout. Approved upcoming products surface as Coming Soon.

export interface AvailabilityInfo {
  isUpcoming: boolean;
  isPurchasable: boolean;
  isDeadListing: boolean;
  minPrice: number;
  hasValidPrice: boolean;
  hasStock: boolean;
}

function toNumber(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

export function getGameAttributes(game: any): Record<string, any> {
  if (!game) return {};
  const a = (game as any).attributes;
  if (!a) return {};
  if (typeof a === 'object') return a as Record<string, any>;
  try {
    return JSON.parse(String(a)) || {};
  } catch {
    return {};
  }
}

export function isUpcomingGame(game: any): boolean {
  if (!game) return false;
  if ((game as any).is_upcoming === true) return true;
  const attrs = getGameAttributes(game);
  if (attrs.is_upcoming === true || (attrs as any).isUpcoming === true) return true;
  if (String(attrs.is_upcoming || '').toLowerCase() === 'true') return true;
  if (String(attrs.availability || '').toLowerCase() === 'coming_soon') return true;
  if (String((game as any).digital_game_type || '').toLowerCase() === 'upcoming') return true;
  if (String((game as any).status || '').toLowerCase() === 'coming soon') return true;
  if (String((game as any).status || '').toUpperCase() === 'COMING SOON') return true;
  return false;
}

export function getMinPurchasablePrice(game: any): number {
  if (!game) return 0;
  const types: any[] = Array.isArray((game as any).accountTypes) ? (game as any).accountTypes : [];
  const inStock = types
    .filter((t: any) => t?.isAvailable || toNumber(t?.stock) > 0 || String(t?.status || '').toUpperCase() === 'IN STOCK')
    .map((t: any) => toNumber(t?.price))
    .filter((n: number) => n > 0);
  if (inStock.length) return Math.min(...inStock);
  const anyPrices = types.map((t: any) => toNumber(t?.price)).filter((n: number) => n > 0);
  if (anyPrices.length) return Math.min(...anyPrices);
  if (typeof (game as any).min_purchasable_price === 'number' && (game as any).min_purchasable_price > 0) {
    return (game as any).min_purchasable_price;
  }
  const base = toNumber((game as any).basePrice);
  if (base > 0) return base;
  return toNumber((game as any).price);
}

export function getAvailability(game: any): AvailabilityInfo {
  if (!game) return { isUpcoming: false, isPurchasable: false, isDeadListing: true, minPrice: 0, hasValidPrice: false, hasStock: false };
  const upcoming = isUpcomingGame(game);
  const minPrice = getMinPurchasablePrice(game);
  const hasValidPrice = minPrice > 0;
  const status = String((game as any).status || '').toUpperCase();
  const types = Array.isArray((game as any).accountTypes) ? (game as any).accountTypes : [];
  const variantStock = types.some((t: any) => t?.isAvailable || toNumber(t?.stock) > 0 || String(t?.status || '').toUpperCase() === 'IN STOCK');
  const hasStock = status === 'IN STOCK' || status === 'LIMITED' || status === 'NEW' || variantStock;
  const dead = !upcoming && !hasStock && !hasValidPrice;
  const purchasable = !upcoming && hasValidPrice && hasStock && !dead;
  return { isUpcoming: upcoming, isPurchasable: purchasable, isDeadListing: dead, minPrice, hasValidPrice, hasStock };
}

export function isPurchasableGame(game: any): boolean {
  if ((game as any)?.is_purchasable === false) return false;
  return getAvailability(game).isPurchasable;
}

export function isDeadListingGame(game: any): boolean {
  return getAvailability(game).isDeadListing;
}

/** Sales listings (storefront, homepage, shop) exclude dead (OOS + zero-priced) and
 *  upcoming products. Out-of-stock items WITH valid pricing stay visible as SOLD OUT. */
export function filterSellableGames<T>(games: T[]): T[] {
  return (games || []).filter((g) => {
    const a = getAvailability(g);
    return !a.isDeadListing && !a.isUpcoming;
  });
}

/** Detects physical products eligible for cash on delivery (TASK 04). */
export function isPhysicalProduct(game: any): boolean {
  const attrs = getGameAttributes(game);
  const t = String(attrs.product_type || attrs.fulfillment || attrs.delivery_method || '').toLowerCase();
  if (t.includes('physical') || t.includes('cod') || t.includes('cash')) return true;
  const cat = String((game as any).category || (game as any).categorySlug || '').toLowerCase();
  if (cat.includes('physical') || cat.includes('hardware') || cat.includes('console') || cat.includes('accessor')) return true;
  return false;
}

/** TASK 03: product kind badge — digital account, key, subscription, or physical. */
export function getProductKind(game: any): 'account' | 'key' | 'subscription' | 'physical' {
  const attrs = getGameAttributes(game);
  const hint = `${attrs.product_type || ''} ${attrs.fulfillment || ''} ${attrs.delivery_method || ''} ${(game as any).category || ''} ${(game as any).categorySlug || ''} ${(game as any).subCategorySlug || ''}`.toLowerCase();
  if (isPhysicalProduct(game)) return 'physical';
  if (hint.includes('ps plus') || hint.includes('playstation-plus') || hint.includes('subscription') || hint.includes('plus')) return 'subscription';
  if (hint.includes('key') || hint.includes('code') || hint.includes('redeem') || hint.includes('gift-card') || hint.includes('gift card')) return 'key';
  return 'account';
}
