'use server'

import { revalidatePath } from 'next/cache'
import { invalidateDashboard } from '@/lib/cache-tags'
import { getServerData } from '@/lib/getServerData'
import { PurchaseOrderRepository } from '@/infrastructure/supabase/repositories/PurchaseOrderRepository'
import { hasFeature } from '@/lib/plan-gates'

export interface CreatePoInput {
  supplierId: string
  expectedAt?: string
  notes?: string
  lines: { productId?: string; description: string; qtyOrdered: number; unitCost: number }[]
}

export async function createPoAction(
  input: CreatePoInput,
): Promise<{ ok: boolean; poId?: string; error?: string }> {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') return { ok: false, error: 'Not allowed.' }
  if (!hasFeature(store, 'purchase_orders.create')) return { ok: false, error: 'Purchase orders are a Pro feature.' }
  if (!input.supplierId) return { ok: false, error: 'Pick a supplier.' }
  if (input.lines.length === 0) return { ok: false, error: 'Add at least one line.' }
  for (const l of input.lines) {
    if (!l.description.trim()) return { ok: false, error: 'Every line needs a description.' }
    if (!Number.isFinite(l.qtyOrdered) || l.qtyOrdered <= 0) return { ok: false, error: 'Qty must be > 0.' }
    if (!Number.isFinite(l.unitCost) || l.unitCost < 0) return { ok: false, error: 'Unit cost must be >= 0.' }
  }

  const repo = new PurchaseOrderRepository(supabase)
  try {
    const po = await repo.create(store.id, {
      supplierId: input.supplierId,
      expectedAt: input.expectedAt,
      notes: input.notes,
      lines: input.lines.map((l) => ({
        productId: l.productId,
        description: l.description.trim(),
        qtyOrdered: l.qtyOrdered,
        unitCost: l.unitCost,
      })),
    })
    revalidatePath('/purchase-orders')
    revalidatePath('/dashboard')
    invalidateDashboard()
    return { ok: true, poId: po.id }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create PO.' }
  }
}

export async function receiveLineAction(
  poId: string, lineId: string, qtyReceived: number,
): Promise<{ ok: boolean; error?: string }> {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') return { ok: false, error: 'Not allowed.' }
  if (!hasFeature(store, 'purchase_orders.create')) return { ok: false, error: 'Purchase orders are a Pro feature.' }
  if (!Number.isFinite(qtyReceived) || qtyReceived < 0) {
    return { ok: false, error: 'Received qty must be >= 0.' }
  }
  const repo = new PurchaseOrderRepository(supabase)
  try {
    await repo.receiveLine(store.id, lineId, qtyReceived)
    await repo.refreshStatus(store.id, poId)
    revalidatePath('/purchase-orders')
    revalidatePath('/dashboard')
    invalidateDashboard()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' }
  }
}

export async function cancelPoAction(poId: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') return { ok: false, error: 'Not allowed.' }
  if (!hasFeature(store, 'purchase_orders.create')) return { ok: false, error: 'Purchase orders are a Pro feature.' }
  const repo = new PurchaseOrderRepository(supabase)
  try {
    await repo.setStatus(store.id, poId, 'cancelled')
    revalidatePath('/purchase-orders')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' }
  }
}

export async function archivePoAction(poId: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, store, role } = await getServerData()
  if (role === 'cashier') return { ok: false, error: 'Not allowed.' }
  if (!hasFeature(store, 'purchase_orders.create')) return { ok: false, error: 'Purchase orders are a Pro feature.' }
  const repo = new PurchaseOrderRepository(supabase)
  try {
    await repo.archive(store.id, poId)
    revalidatePath('/purchase-orders')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed.' }
  }
}
