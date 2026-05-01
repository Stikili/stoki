'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/infrastructure/supabase/server'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { InvoiceRepository } from '@/infrastructure/supabase/repositories/InvoiceRepository'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { CustomerRepository } from '@/infrastructure/supabase/repositories/CustomerRepository'
import { computeVat } from '@/lib/vat'
import { InvoiceLineItem, InvoiceStatus } from '@/domain/entities/invoice'

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

export async function createInvoiceAction(input: CreateInvoiceInput): Promise<{ ok: boolean; invoiceId?: string; error?: string }> {
  const { supabase, store } = await getContext()
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
