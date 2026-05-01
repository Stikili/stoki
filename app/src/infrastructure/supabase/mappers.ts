/**
 * Maps raw Supabase DB rows (snake_case) to domain entities (camelCase).
 * Keeps the infrastructure/domain boundary clean.
 */

import { Store } from '@/domain/entities/store'
import { Product } from '@/domain/entities/product'
import { Sale } from '@/domain/entities/sale'
import { Debtor } from '@/domain/entities/debtor'
import { CreditEntry } from '@/domain/entities/credit-entry'
import { Alert } from '@/domain/entities/alert'
import { Expense } from '@/domain/entities/expense'
import { Restock } from '@/domain/entities/restock'
import { Supplier } from '@/domain/entities/supplier'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toStore(row: any): Store {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    phone: row.phone ?? null,
    plan: row.plan,
    timezone: row.timezone,
    category: row.category ?? null,
    location: row.location ?? null,
    whatsappNumber: row.whatsapp_number ?? null,
    onboardingCompleted: row.onboarding_completed ?? false,
    vatRegistered: row.vat_registered ?? false,
    vatNumber: row.vat_number ?? null,
    vatRate: Number(row.vat_rate ?? 15),
    businessAddress: row.business_address ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toProduct(row: any): Product {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    price: Number(row.price),
    cost: Number(row.cost),
    qty: row.qty,
    reorderPoint: row.reorder_point,
    sku: row.sku ?? null,
    photoUrl: row.photo_url ?? null,
    expiryDate: row.expiry_date ?? null,
    vatInclusive: row.vat_inclusive ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSale(row: any): Sale {
  return {
    id: row.id,
    storeId: row.store_id,
    productId: row.product_id ?? null,
    productName: row.products?.name ?? null,
    qty: row.qty,
    priceAtSale: Number(row.price_at_sale),
    costAtSale: Number(row.cost_at_sale ?? 0),
    vatAmount: Number(row.vat_amount ?? 0),
    invoiceNumber: row.invoice_number ?? null,
    type: row.type ?? 'sale',
    channel: row.channel,
    paymentMethod: row.payment_method ?? 'cash',
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toRestock(row: any): Restock {
  return {
    id: row.id,
    storeId: row.store_id,
    productId: row.product_id ?? null,
    productName: row.products?.name ?? null,
    qtyAdded: row.qty_added,
    cost: row.cost !== null && row.cost !== undefined ? Number(row.cost) : null,
    supplierId: row.supplier_id ?? null,
    supplierName: row.suppliers?.name ?? null,
    notes: row.notes ?? null,
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSupplier(row: any): Supplier {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    contactName: row.contact_name ?? null,
    phone: row.phone ?? null,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toDebtor(row: any): Debtor {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    phone: row.phone ?? null,
    totalOwed: Number(row.total_owed),
    lastRemindedAt: row.last_reminded_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toCreditEntry(row: any): CreditEntry {
  return {
    id: row.id,
    storeId: row.store_id,
    debtorId: row.debtor_id,
    amount: Number(row.amount),
    itemsJson: row.items_json ?? null,
    settledAt: row.settled_at ?? null,
    createdAt: row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toExpense(row: any): Expense {
  return {
    id: row.id,
    storeId: row.store_id,
    category: row.category,
    description: row.description,
    amount: Number(row.amount),
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toAlert(row: any): Alert {
  return {
    id: row.id,
    storeId: row.store_id,
    type: row.type,
    message: row.message,
    readAt: row.read_at ?? null,
    actionTakenAt: row.action_taken_at ?? null,
    createdAt: row.created_at,
  }
}
