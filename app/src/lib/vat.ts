// VAT helpers used by sale recording, dashboard, and receipts.

export interface VatBreakdown {
  /** Selling price as displayed to the customer (always inclusive of any VAT charged). */
  inclusive: number
  /** Price net of VAT. */
  exclusive: number
  /** VAT amount, in rand. */
  vat: number
}

/**
 * Compute the VAT breakdown for a single line item.
 *
 * @param unitPrice  Price as captured at time of sale (already × qty if you pass line total).
 * @param qty        Quantity sold.
 * @param storeVatRegistered  If false, no VAT is charged regardless of product flag.
 * @param productVatInclusive If true, unitPrice already includes VAT (SA retail standard).
 *                            If false, VAT is added on top of the price.
 * @param vatRate    Percent — e.g. 15 for 15%.
 */
export function computeVat(
  unitPrice: number,
  qty: number,
  storeVatRegistered: boolean,
  productVatInclusive: boolean,
  vatRate: number,
): VatBreakdown {
  const lineTotal = unitPrice * qty

  if (!storeVatRegistered || vatRate <= 0) {
    return { inclusive: lineTotal, exclusive: lineTotal, vat: 0 }
  }

  const rate = vatRate / 100

  if (productVatInclusive) {
    // Extract VAT portion from VAT-inclusive price.
    const exclusive = lineTotal / (1 + rate)
    const vat = lineTotal - exclusive
    return {
      inclusive: round2(lineTotal),
      exclusive: round2(exclusive),
      vat: round2(vat),
    }
  }

  // VAT-exclusive: add VAT on top.
  const vat = lineTotal * rate
  return {
    inclusive: round2(lineTotal + vat),
    exclusive: round2(lineTotal),
    vat: round2(vat),
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
