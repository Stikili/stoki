/**
 * Formatters that turn a ledger row (sale / expense / restock) into a
 * pre-filled question for the Stoki AI advisor.
 *
 * Kept pure so tests can pin the exact prompt shape — the shape matters
 * because the advisor's system prompt tells it to ground factual claims
 * with tool calls, but for "explain THIS transaction" we want the model
 * to reason about the provided row rather than re-derive it via tools.
 *
 * All strings are plain-English regardless of tone — the advisor's
 * system prompt handles the tone adaptation for the response.
 */

/** Format a currency amount as Rands with two decimals. */
function rand(n: number): string {
  return `R${Number(n).toFixed(2)}`
}

/** Format an ISO timestamp as a short local date string (23 Jan 2026). */
function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso.slice(0, 10)
  }
}

export interface SaleContext {
  productName: string
  qty: number
  pricePerUnit: number
  totalAmount: number
  recordedAt: string
  wasCredit?: boolean
  customerName?: string | null
}

export function askAiAboutSale(sale: SaleContext): string {
  const line = `${sale.qty}× ${sale.productName} at ${rand(sale.pricePerUnit)} each = ${rand(sale.totalAmount)}`
  const context = [
    line,
    `Date: ${shortDate(sale.recordedAt)}`,
    sale.wasCredit ? `Sold on credit${sale.customerName ? ` to ${sale.customerName}` : ''}` : 'Paid at the till',
  ].join('. ')
  return `Explain this sale to me: ${context}. Is this a good sale for my shop, or is there something to watch?`
}

export interface ExpenseContext {
  category: string
  description: string
  amount: number
  recordedAt: string
  isCapital?: boolean
}

export function askAiAboutExpense(expense: ExpenseContext): string {
  const parts = [
    `Category: ${expense.category}`,
    `Description: ${expense.description || '(none)'}`,
    `Amount: ${rand(expense.amount)}`,
    `Date: ${shortDate(expense.recordedAt)}`,
    expense.isCapital ? 'Marked as capital (asset)' : 'Marked as operating expense',
  ].join('. ')
  return `Explain this expense: ${parts}. Is this normal for my kind of shop, or unusually high? Anything I should adjust?`
}

export interface RestockContext {
  productName: string
  qty: number
  unitCost: number
  totalCost: number
  supplierName?: string | null
  recordedAt: string
}

export function askAiAboutRestock(restock: RestockContext): string {
  const parts = [
    `Product: ${restock.productName}`,
    `Bought: ${restock.qty} units at ${rand(restock.unitCost)} each = ${rand(restock.totalCost)}`,
    restock.supplierName ? `Supplier: ${restock.supplierName}` : 'Supplier: not recorded',
    `Date: ${shortDate(restock.recordedAt)}`,
  ].join('. ')
  return `Explain this restock: ${parts}. Am I paying a fair price, and does the quantity make sense given how fast this product sells?`
}

/** URL to the advisor with this prompt pre-filled and auto-sent on load. */
export function askAiUrl(prompt: string): string {
  return `/advisor?q=${encodeURIComponent(prompt)}&send=1`
}
