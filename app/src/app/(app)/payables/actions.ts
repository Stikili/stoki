'use server'

import { revalidatePath } from 'next/cache'
import { getServerData } from '@/lib/getServerData'
import { SupplierBillRepository } from '@/infrastructure/supabase/repositories/SupplierBillRepository'

export interface CreateBillInput {
  supplierId: string
  reference?: string
  issuedAt?: string
  dueAt: string
  total: number
  notes?: string
}

export async function createBillAction(
  input: CreateBillInput,
): Promise<{ ok: boolean; billId?: string; error?: string }> {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') return { ok: false, error: 'Not allowed.' }
  if (!input.supplierId) return { ok: false, error: 'Pick a supplier.' }
  if (!input.dueAt) return { ok: false, error: 'Set a due date.' }
  if (!Number.isFinite(input.total) || input.total <= 0) {
    return { ok: false, error: 'Total must be greater than zero.' }
  }

  const repo = new SupplierBillRepository(supabase)
  try {
    const bill = await repo.create(store.id, {
      supplierId: input.supplierId,
      reference: input.reference,
      issuedAt: input.issuedAt,
      dueAt: input.dueAt,
      total: input.total,
      notes: input.notes,
    })
    revalidatePath('/payables')
    revalidatePath('/dashboard')
    return { ok: true, billId: bill.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create bill.' }
  }
}

export async function recordBillPaymentAction(
  billId: string,
  amount: number,
  paymentMethod: string,
  notes?: string,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') return { ok: false, error: 'Not allowed.' }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: 'Payment amount must be greater than zero.' }
  }

  const repo = new SupplierBillRepository(supabase)
  try {
    await repo.recordPayment(store.id, billId, amount, paymentMethod, notes)
    revalidatePath('/payables')
    revalidatePath('/dashboard')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to record payment.' }
  }
}

export async function archiveBillAction(billId: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') return { ok: false, error: 'Not allowed.' }
  const repo = new SupplierBillRepository(supabase)
  try {
    await repo.archive(store.id, billId)
    revalidatePath('/payables')
    revalidatePath('/dashboard')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to archive bill.' }
  }
}
