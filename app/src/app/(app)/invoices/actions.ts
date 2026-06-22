'use server'

import { revalidatePath } from 'next/cache'
import { invalidateDashboard } from '@/lib/cache-tags'
import { redirect } from 'next/navigation'
import { createClient } from '@/infrastructure/supabase/server'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { InvoiceRepository } from '@/infrastructure/supabase/repositories/InvoiceRepository'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { CustomerRepository } from '@/infrastructure/supabase/repositories/CustomerRepository'
import { computeVat } from '@/lib/vat'
import { InvoiceLineItem, InvoiceStatus } from '@/domain/entities/invoice'
import { hasFeature } from '@/lib/plan-gates'

async function getContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const storeRepo = new StoreRepository(supabase)
  const store = await storeRepo.getByOwnerId(user.id)
  if (!store) redirect('/login')
  return { supabase, store }
}

export interface CreateInvoiceInput {
  customerId: string
  dueDays?: number
  status?: InvoiceStatus
  notes?: string
  lines: Array<{ description: string; qty: number; unitPrice: number; vatInclusive?: boolean; productId?: string }>
}

export async function createInvoiceAction(input: CreateInvoiceInput): Promise<{ ok: boolean; invoiceId?: string; error?: string; locked?: 'invoice.create' }> {
  const { supabase, store } = await getContext()
  // Plan gate: B2B invoicing is Pro+. We surface a `locked` flag so the
  // client can open the UpgradePrompt instead of treating it as a generic
  // error — the user's intent was right, the plan was wrong.
  if (!hasFeature(store, 'invoice.create')) {
    return { ok: false, error: 'Invoicing is a Pro feature.', locked: 'invoice.create' }
  }
  if (!input.customerId) return { ok: false, error: 'Pick a customer' }
  if (input.lines.length === 0) return { ok: false, error: 'Add at least one line item' }

  const customerRepo = new CustomerRepository(supabase)
  const customer = await customerRepo.findById(store.id, input.customerId)
  if (!customer) return { ok: false, error: 'Customer not found' }

  // Compute VAT per line.
  const items: InvoiceLineItem[] = []
  let subtotalExcl = 0
  let vatTotal = 0
  let total = 0
  for (const l of input.lines) {
    if (!l.description.trim() || l.qty <= 0 || l.unitPrice < 0) continue
    const inclusive = l.vatInclusive ?? true
    const breakdown = computeVat(l.unitPrice, l.qty, store.vatRegistered, inclusive, store.vatRate)
    items.push({
      description: l.description.trim(),
      qty: l.qty,
      unitPrice: l.unitPrice,
      vatAmount: breakdown.vat,
      vatInclusive: inclusive,
      productId: l.productId,
    })
    subtotalExcl += breakdown.exclusive
    vatTotal += breakdown.vat
    total += breakdown.inclusive
  }
  if (items.length === 0) return { ok: false, error: 'No valid line items' }

  // Claim next invoice number from the same per-store sequence used by POS sales.
  const saleRepo = new SaleRepository(supabase)
  const invoiceNumber = await saleRepo.claimInvoiceNumber(store.id)

  const dueDays = input.dueDays ?? customer.paymentTermsDays ?? 30
  const dueAt = new Date(); dueAt.setDate(dueAt.getDate() + dueDays)

  const repo = new InvoiceRepository(supabase)
  const invoice = await repo.create(store.id, {
    customerId: input.customerId,
    status: input.status ?? 'draft',
    dueAt: dueAt.toISOString(),
    lineItems: items,
    notes: input.notes,
    invoiceNumber,
    subtotalExcl: Number(subtotalExcl.toFixed(2)),
    vatAmount: Number(vatTotal.toFixed(2)),
    total: Number(total.toFixed(2)),
  })

  revalidatePath('/invoices')
  revalidatePath('/customers')
  revalidatePath('/dashboard')
  invalidateDashboard(store.id)
  return { ok: true, invoiceId: invoice.id }
}

export async function recordInvoicePaymentAction(
  invoiceId: string,
  amount: number,
  paymentMethod: string,
  notes?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, store } = await getContext()
  if (amount <= 0) return { ok: false, error: 'Amount must be positive' }
  const repo = new InvoiceRepository(supabase)
  await repo.recordPayment(store.id, invoiceId, amount, paymentMethod, notes)
  revalidatePath('/invoices')
  revalidatePath('/customers')
  revalidatePath('/dashboard')
  invalidateDashboard(store.id)
  return { ok: true }
}

export async function updateInvoiceStatusAction(invoiceId: string, status: InvoiceStatus): Promise<{ ok: boolean }> {
  const { supabase, store } = await getContext()
  const repo = new InvoiceRepository(supabase)
  await repo.updateStatus(store.id, invoiceId, status)
  revalidatePath('/invoices')
  return { ok: true }
}

export async function archiveInvoiceAction(invoiceId: string): Promise<{ ok: boolean }> {
  const { supabase, store } = await getContext()
  const repo = new InvoiceRepository(supabase)
  await repo.archive(store.id, invoiceId)
  revalidatePath('/invoices')
  revalidatePath('/customers')
  return { ok: true }
}

export async function getInvoicePaymentsAction(invoiceId: string) {
  const { supabase, store } = await getContext()
  const repo = new InvoiceRepository(supabase)
  return repo.findPayments(store.id, invoiceId)
}

export async function duplicateInvoiceAction(invoiceId: string): Promise<{ ok: boolean; invoiceId?: string; error?: string }> {
  const { supabase, store } = await getContext()
  const repo = new InvoiceRepository(supabase)
  const source = await repo.findById(store.id, invoiceId)
  if (!source) return { ok: false, error: 'Invoice not found' }
  if (!source.customerId) return { ok: false, error: 'Source invoice has no customer' }
  return createInvoiceAction({
    customerId: source.customerId,
    status: 'draft',
    notes: source.notes ?? undefined,
    lines: source.lineItems.map(l => ({
      description: l.description,
      qty: l.qty,
      unitPrice: l.unitPrice,
      vatInclusive: l.vatInclusive,
      productId: l.productId,
    })),
  })
}
