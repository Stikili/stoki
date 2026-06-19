/**
 * Balance sheet — point-in-time snapshot of what the business owns and owes.
 * Derived from the existing tables (no separate journal/ledger schema):
 *
 *   ASSETS
 *     Cash on hand                from store.cash_balance
 *     Inventory                   from sum(cost × qty) across products (bundles excluded)
 *     Receivables — invoices      from sum of open invoice balances
 *     Receivables — credit book   from sum of debtor.total_owed
 *     Fixed assets (net book)     from sum of bookValue(active asset, asOf)
 *
 *   LIABILITIES
 *     Payables — supplier bills   from sum of open supplier bill balances
 *
 *   EQUITY (balancing figure)
 *     Owner's equity = total assets − total liabilities
 *
 * This is single-entry from a single-entry source of truth, so the equity
 * balance reflects accumulated history. Owners hand this to their accountant
 * at year-end; the accountant maps it onto a proper double-entry trial
 * balance if they need to.
 */

import type { Product } from '@/domain/entities/product'
import type { Invoice } from '@/domain/entities/invoice'
import { balanceOf as invoiceBalance } from '@/domain/entities/invoice'
import type { Debtor } from '@/domain/entities/debtor'
import type { SupplierBill } from '@/domain/entities/supplier-bill'
import { balanceOf as billBalance } from '@/domain/entities/supplier-bill'
import type { FixedAsset } from '@/domain/entities/fixed-asset'
import { bookValue } from '@/domain/entities/fixed-asset'

export interface BalanceSheetInputs {
  asOf: Date
  cashBalance: number | null
  products: Product[]
  openInvoices: Invoice[]
  debtors: Debtor[]
  openBills: SupplierBill[]
  assets: FixedAsset[]
}

export interface BalanceSheet {
  asOf: Date
  cash: number
  inventory: number
  invoiceReceivables: number
  creditBookReceivables: number
  fixedAssetsBook: number
  totalAssets: number

  supplierPayables: number
  totalLiabilities: number

  ownersEquity: number
}

export function buildBalanceSheet(input: BalanceSheetInputs): BalanceSheet {
  const cash = input.cashBalance ?? 0

  const inventory = input.products.reduce((sum, p) => {
    if (p.qty <= 0 || p.isBundle) return sum
    return sum + p.cost * p.qty
  }, 0)

  const invoiceReceivables = input.openInvoices.reduce((sum, inv) => sum + invoiceBalance(inv), 0)
  const creditBookReceivables = input.debtors.reduce((sum, d) => sum + Math.max(0, d.totalOwed), 0)

  const fixedAssetsBook = input.assets.reduce((sum, a) => {
    if (a.status === 'disposed') return sum
    return sum + bookValue(a, input.asOf)
  }, 0)

  const totalAssets = cash + inventory + invoiceReceivables + creditBookReceivables + fixedAssetsBook

  const supplierPayables = input.openBills.reduce((sum, b) => sum + billBalance(b), 0)
  const totalLiabilities = supplierPayables

  const ownersEquity = totalAssets - totalLiabilities

  return {
    asOf: input.asOf,
    cash,
    inventory,
    invoiceReceivables,
    creditBookReceivables,
    fixedAssetsBook,
    totalAssets,
    supplierPayables,
    totalLiabilities,
    ownersEquity,
  }
}
