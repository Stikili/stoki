import type { Product } from '@/domain/entities/product'

/**
 * Result of a barcode / SKU lookup against a product list.
 *
 * `match` is the single matching product, or null when none match.
 * `ambiguous` is true when two or more products share the same
 * normalised SKU — in that case `match` still points at the FIRST
 * match (for legacy callers that don't handle the ambiguous flag),
 * but callers SHOULD refuse to auto-select and prompt the operator
 * to disambiguate.
 *
 * Closes BUG-015 (SKU lookup case-sensitivity drift) from the
 * 2026-07-18 code review: InventoryClient used case-sensitive
 * `p.sku === code` while SalesClient / StocktakeClient used
 * case-insensitive `.toLowerCase()`. Users with mixed-case SKUs
 * ('ABC-123') could scan them in Sales but not in Inventory. This
 * helper is the single source of truth for barcode↔product matching.
 *
 * Closes BUG-007 (duplicate SKU silent wrong-product): the DB has
 * no UNIQUE constraint on (store_id, sku), so two products can
 * legitimately share a SKU (data-entry mistake, promo pack SKU'd
 * like parent, CSV re-import). Rather than silently picking the
 * first-inserted one, callers can now surface the ambiguity to the
 * cashier and let them choose.
 */
export interface SkuLookupResult<P extends Pick<Product, 'sku'>> {
  match: P | null
  ambiguous: boolean
  /** Normalised (trimmed + lowercased) code used for the compare. */
  normalisedCode: string
}

/** Normalise a SKU / barcode for comparison — trim + lowercase.
 *  Applied symmetrically to both the scan code and each product's SKU
 *  so any case-and-whitespace variant matches. */
export function normaliseSku(sku: string | null | undefined): string {
  return (sku ?? '').trim().toLowerCase()
}

/**
 * Find the product(s) matching a scanned/typed barcode. Empty scans
 * return no match without walking the product list.
 */
export function matchProductBySku<P extends Pick<Product, 'sku'>>(
  products: readonly P[],
  code: string,
): SkuLookupResult<P> {
  const normalisedCode = normaliseSku(code)
  if (!normalisedCode) {
    return { match: null, ambiguous: false, normalisedCode }
  }
  const matches = products.filter(p => normaliseSku(p.sku) === normalisedCode)
  return {
    match: matches[0] ?? null,
    ambiguous: matches.length > 1,
    normalisedCode,
  }
}
