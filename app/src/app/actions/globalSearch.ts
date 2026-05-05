'use server'

import { getServerData } from '@/lib/getServerData'

export type GlobalSearchKind = 'product' | 'customer' | 'invoice' | 'supplier' | 'debtor'

export interface GlobalSearchResult {
  kind: GlobalSearchKind
  id: string
  label: string
  subLabel?: string
  href: string
}

const PER_KIND_LIMIT = 5

/**
 * Cross-entity search for the command palette. RLS scopes everything to the
 * caller's stores; we additionally filter to the selected store so a query
 * doesn't surface rows from a sibling store the user isn't currently looking
 * at. Returns up to PER_KIND_LIMIT results per kind, ordered most-relevant
 * first within the kind.
 */
export async function globalSearchAction(rawQuery: string): Promise<GlobalSearchResult[]> {
  const q = rawQuery.trim()
  if (q.length === 0) return []

  const { supabase, store } = await getServerData()
  const like = `%${escapeIlike(q)}%`
  const results: GlobalSearchResult[] = []

  const [products, customers, suppliers, debtors, invoices] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, sku, price, qty')
      .eq('store_id', store.id)
      .is('deleted_at', null)
      .or(`name.ilike.${like},sku.ilike.${like}`)
      .order('name')
      .limit(PER_KIND_LIMIT),
    supabase
      .from('customers')
      .select('id, name, phone, email')
      .eq('store_id', store.id)
      .is('deleted_at', null)
      .ilike('name', like)
      .order('name')
      .limit(PER_KIND_LIMIT),
    supabase
      .from('suppliers')
      .select('id, name, phone')
      .eq('store_id', store.id)
      .is('deleted_at', null)
      .ilike('name', like)
      .order('name')
      .limit(PER_KIND_LIMIT),
    supabase
      .from('debtors')
      .select('id, name, phone, total_owed')
      .eq('store_id', store.id)
      .is('deleted_at', null)
      .ilike('name', like)
      .order('total_owed', { ascending: false })
      .limit(PER_KIND_LIMIT),
    searchInvoices(supabase, store.id, q, like),
  ])

  for (const row of products.data ?? []) {
    results.push({
      kind: 'product',
      id: row.id,
      label: row.name,
      subLabel: `R${Number(row.price).toFixed(2)} · ${row.qty} on hand${row.sku ? ` · ${row.sku}` : ''}`,
      href: `/inventory?focus=${row.id}`,
    })
  }
  for (const row of customers.data ?? []) {
    results.push({
      kind: 'customer',
      id: row.id,
      label: row.name,
      subLabel: row.phone ?? row.email ?? undefined,
      href: `/customers?focus=${row.id}`,
    })
  }
  for (const row of debtors.data ?? []) {
    const owed = Number(row.total_owed ?? 0)
    results.push({
      kind: 'debtor',
      id: row.id,
      label: row.name,
      subLabel: owed > 0 ? `Owes R${owed.toFixed(2)}` : (row.phone ?? undefined),
      href: `/credit/${row.id}`,
    })
  }
  for (const row of suppliers.data ?? []) {
    results.push({
      kind: 'supplier',
      id: row.id,
      label: row.name,
      subLabel: row.phone ?? undefined,
      href: `/suppliers?focus=${row.id}`,
    })
  }
  for (const row of invoices) {
    const customerName = row.customers?.name ?? '—'
    results.push({
      kind: 'invoice',
      id: row.id,
      label: `Invoice #${row.invoice_number}`,
      subLabel: `${customerName} · R${Number(row.total).toFixed(2)} · ${row.status}`,
      href: `/invoices/${row.id}`,
    })
  }

  return results
}

interface InvoiceSearchRow {
  id: string
  invoice_number: number
  customers: { name: string } | null
  total: number
  status: string
}

async function searchInvoices(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  storeId: string,
  q: string,
  like: string,
): Promise<InvoiceSearchRow[]> {
  const numeric = q.match(/^#?(\d+)$/)?.[1]
  if (numeric) {
    const { data } = await supabase
      .from('invoices')
      .select('id, invoice_number, total, status, customers(name)')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .eq('invoice_number', Number(numeric))
      .limit(PER_KIND_LIMIT)
    return (data as InvoiceSearchRow[] | null) ?? []
  }
  // Match invoices whose customer's name ILIKE q. The !inner join filters out
  // invoices without a customer (one-off untracked invoices).
  const { data } = await supabase
    .from('invoices')
    .select('id, invoice_number, total, status, customers!inner(name)')
    .eq('store_id', storeId)
    .is('deleted_at', null)
    .ilike('customers.name', like)
    .order('invoice_number', { ascending: false })
    .limit(PER_KIND_LIMIT)
  return (data as InvoiceSearchRow[] | null) ?? []
}

function escapeIlike(s: string): string {
  return s.replace(/[%_\\]/g, (m) => `\\${m}`)
}
