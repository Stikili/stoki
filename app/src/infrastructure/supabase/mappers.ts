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
import { StoreUser } from '@/domain/entities/store-user'
import { Customer } from '@/domain/entities/customer'
import { Invoice, InvoiceLineItem, InvoicePayment } from '@/domain/entities/invoice'
import { SupplierBill, SupplierBillPayment } from '@/domain/entities/supplier-bill'
import { RecurringExpense } from '@/domain/entities/recurring-expense'
import { Wastage } from '@/domain/entities/wastage'
import { Stocktake, StocktakeLine } from '@/domain/entities/stocktake'
import { AirtimePin } from '@/domain/entities/airtime-pin'
import { BundleComponent } from '@/domain/entities/bundle'
import { WhatsAppBroadcast, BroadcastRecipient } from '@/domain/entities/whatsapp-broadcast'

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
    isDemo: row.is_demo ?? false,
    lat: row.lat !== null && row.lat !== undefined ? Number(row.lat) : null,
    lng: row.lng !== null && row.lng !== undefined ? Number(row.lng) : null,
    cashBalance: row.cash_balance !== null && row.cash_balance !== undefined ? Number(row.cash_balance) : null,
    cashBalanceUpdatedAt: row.cash_balance_updated_at ?? null,
    taxpayerType: row.taxpayer_type ?? 'sole_prop',
    grandfatheredUntil: row.grandfathered_until ?? null,
    subscriptionStatus: row.subscription_status ?? 'none',
    subscriptionActiveUntil: row.subscription_active_until ?? null,
    subscriptionProvider: row.subscription_provider ?? null,
    subscriptionProviderRef: row.subscription_provider_ref ?? null,
    subscriptionLastChargeAt: row.subscription_last_charge_at ?? null,
    subscriptionRetryCount: Number(row.subscription_retry_count ?? 0),
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
    // qty and reorder_point are numeric(10,3) post-migration-015 — Postgres
    // returns numeric as a string from PostgREST, so coerce explicitly.
    qty: Number(row.qty),
    reorderPoint: Number(row.reorder_point),
    sku: row.sku ?? null,
    photoUrl: row.photo_url ?? null,
    expiryDate: row.expiry_date ?? null,
    vatInclusive: row.vat_inclusive ?? true,
    isAirtime: row.is_airtime ?? false,
    isBundle: row.is_bundle ?? false,
    isWeighable: row.is_weighable ?? false,
    unitLabel: row.unit_label ?? 'each',
    vatCode: row.vat_code ?? 'standard',
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
    // Joined products(name) wins when a product_id exists; the sales.product_name
    // column kicks in for manual / off-book sales (productId is null).
    productName: row.products?.name ?? row.product_name ?? null,
    qty: Number(row.qty),
    priceAtSale: Number(row.price_at_sale),
    costAtSale: Number(row.cost_at_sale ?? 0),
    vatAmount: Number(row.vat_amount ?? 0),
    vatCode: row.vat_code ?? null,
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
    qtyAdded: Number(row.qty_added),
    cost: row.cost !== null && row.cost !== undefined ? Number(row.cost) : null,
    supplierId: row.supplier_id ?? null,
    supplierName: row.suppliers?.name ?? null,
    notes: row.notes ?? null,
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toCustomer(row: any): Customer {
  return {
    id: row.id,
    storeId: row.store_id,
    name: row.name,
    contactName: row.contact_name ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    vatNumber: row.vat_number ?? null,
    billingAddress: row.billing_address ?? null,
    paymentTermsDays: row.payment_terms_days ?? 30,
    notes: row.notes ?? null,
    marketingOptIn: row.marketing_opt_in ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toInvoice(row: any): Invoice {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (row.line_items ?? []) as any[]
  const lineItems: InvoiceLineItem[] = items.map(i => ({
    description: i.description ?? '',
    qty: Number(i.qty ?? 0),
    unitPrice: Number(i.unit_price ?? i.unitPrice ?? 0),
    vatAmount: Number(i.vat_amount ?? i.vatAmount ?? 0),
    vatInclusive: i.vat_inclusive ?? i.vatInclusive ?? true,
    productId: i.product_id ?? i.productId,
  }))
  return {
    id: row.id,
    storeId: row.store_id,
    customerId: row.customer_id ?? null,
    customerName: row.customers?.name ?? null,
    invoiceNumber: row.invoice_number,
    status: row.status,
    issuedAt: row.issued_at,
    dueAt: row.due_at,
    lineItems,
    subtotalExcl: Number(row.subtotal_excl ?? 0),
    vatAmount: Number(row.vat_amount ?? 0),
    total: Number(row.total ?? 0),
    amountPaid: Number(row.amount_paid ?? 0),
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toInvoicePayment(row: any): InvoicePayment {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    storeId: row.store_id,
    amount: Number(row.amount),
    paidAt: row.paid_at,
    paymentMethod: row.payment_method,
    notes: row.notes ?? null,
    createdAt: row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toWastage(row: any): Wastage {
  return {
    id: row.id,
    storeId: row.store_id,
    productId: row.product_id ?? null,
    productName: row.products?.name ?? null,
    qty: Number(row.qty),
    costAtLoss: Number(row.cost_at_loss ?? 0),
    reason: row.reason ?? 'other',
    notes: row.notes ?? null,
    recordedAt: row.recorded_at,
    createdAt: row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toStocktakeLine(row: any): StocktakeLine {
  return {
    id: row.id,
    productId: row.product_id ?? null,
    productName: row.products?.name ?? null,
    systemQty: Number(row.system_qty),
    countedQty: Number(row.counted_qty),
    variance: Number(row.variance),
    costPerUnit: Number(row.cost_per_unit ?? 0),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toStocktake(row: any): Stocktake {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawLines = (row.lines ?? []) as any[]
  return {
    id: row.id,
    storeId: row.store_id,
    performedBy: row.performed_by ?? null,
    performedAt: row.performed_at,
    notes: row.notes ?? null,
    createdAt: row.created_at,
    lines: rawLines.map(toStocktakeLine),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toWhatsAppBroadcast(row: any): WhatsAppBroadcast {
  return {
    id: row.id,
    storeId: row.store_id,
    templateName: row.template_name,
    languageCode: row.language_code ?? 'en',
    bodyParams: Array.isArray(row.body_params) ? row.body_params : [],
    notes: row.notes ?? null,
    sentBy: row.sent_by ?? null,
    sentAt: row.sent_at ?? null,
    recipientCount: row.recipient_count ?? 0,
    sentCount: row.sent_count ?? 0,
    failedCount: row.failed_count ?? 0,
    createdAt: row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toBroadcastRecipient(row: any): BroadcastRecipient {
  return {
    id: row.id,
    broadcastId: row.broadcast_id,
    storeId: row.store_id,
    customerId: row.customer_id ?? null,
    customerName: row.customers?.name ?? null,
    phone: row.phone,
    status: row.status,
    error: row.error ?? null,
    sentAt: row.sent_at ?? null,
    createdAt: row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toBundleComponent(row: any): BundleComponent {
  return {
    id: row.id,
    storeId: row.store_id,
    bundleId: row.bundle_id,
    componentId: row.component_id,
    componentName: row.component?.name ?? null,
    componentCost: row.component?.cost != null ? Number(row.component.cost) : null,
    componentQty: row.component?.qty ?? null,
    qty: row.qty,
    createdAt: row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toAirtimePin(row: any): AirtimePin {
  return {
    id: row.id,
    storeId: row.store_id,
    productId: row.product_id,
    pin: row.pin,
    serial: row.serial ?? null,
    expiresAt: row.expires_at ?? null,
    soldAt: row.sold_at ?? null,
    soldInSaleId: row.sold_in_sale_id ?? null,
    createdAt: row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toStoreUser(row: any): StoreUser {
  return {
    id: row.id,
    storeId: row.store_id,
    userId: row.user_id,
    role: row.role,
    email: row.email ?? null,
    invitedBy: row.invited_by ?? null,
    joinedAt: row.joined_at,
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
    address: row.address ?? null,
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
    description: row.description ?? null,
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
    isCapital: row.is_capital ?? false,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSupplierBill(row: any): SupplierBill {
  return {
    id: row.id,
    storeId: row.store_id,
    supplierId: row.supplier_id,
    supplierName: row.suppliers?.name ?? null,
    reference: row.reference ?? null,
    issuedAt: row.issued_at,
    dueAt: row.due_at,
    total: Number(row.total),
    amountPaid: Number(row.amount_paid ?? 0),
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toSupplierBillPayment(row: any): SupplierBillPayment {
  return {
    id: row.id,
    billId: row.bill_id,
    storeId: row.store_id,
    amount: Number(row.amount),
    paidAt: row.paid_at,
    paymentMethod: row.payment_method,
    notes: row.notes ?? null,
    createdAt: row.created_at,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toRecurringExpense(row: any): RecurringExpense {
  return {
    id: row.id,
    storeId: row.store_id,
    category: row.category,
    description: row.description,
    amount: Number(row.amount),
    isCapital: row.is_capital ?? false,
    frequency: row.frequency,
    dayValue: Number(row.day_value),
    nextDueAt: row.next_due_at,
    lastPostedAt: row.last_posted_at ?? null,
    active: row.active ?? true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
