import { describe, expect, it } from 'vitest'
import { buildInvoiceMessage, buildMailtoUrl, buildWhatsAppUrl } from './invoice-delivery'
import { Invoice } from '@/domain/entities/invoice'
import { Store } from '@/domain/entities/store'
import { Customer } from '@/domain/entities/customer'

const baseStore: Store = {
  id: 's1',
  ownerId: 'u1',
  name: 'Soweto Spaza',
  phone: '0821234567',
  plan: 'free',
  timezone: 'Africa/Johannesburg',
  category: 'spaza',
  location: 'Soweto',
  whatsappNumber: null,
  onboardingCompleted: true,
  vatRegistered: false,
  vatNumber: null,
  vatRate: 15,
  businessAddress: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const baseCustomer: Customer = {
  id: 'c1',
  storeId: 's1',
  name: 'ACME Logistics',
  contactName: 'Jane Doe',
  email: 'jane@acme.co.za',
  phone: '0823334444',
  vatNumber: '4123456789',
  billingAddress: '12 Main St, Joburg',
  paymentTermsDays: 30,
  notes: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const baseInvoice: Invoice = {
  id: 'inv1',
  storeId: 's1',
  customerId: 'c1',
  customerName: 'ACME Logistics',
  invoiceNumber: 7,
  status: 'sent',
  issuedAt: '2026-05-01T08:00:00Z',
  dueAt: '2026-05-31T08:00:00Z',
  lineItems: [
    { description: 'White Bread (700g)', qty: 10, unitPrice: 16.99, vatAmount: 0, vatInclusive: true },
    { description: 'Coke 2L', qty: 5, unitPrice: 29.99, vatAmount: 0, vatInclusive: true },
  ],
  subtotalExcl: 319.85,
  vatAmount: 0,
  total: 319.85,
  amountPaid: 0,
  notes: null,
  createdAt: '2026-05-01T08:00:00Z',
  updatedAt: '2026-05-01T08:00:00Z',
}

describe('buildInvoiceMessage', () => {
  it('greets the contact name when present', () => {
    const msg = buildInvoiceMessage(baseStore, baseInvoice, baseCustomer)
    expect(msg.split('\n')[0]).toBe('Hi Jane Doe,')
  })

  it('falls back to customer name when no contact name', () => {
    const noContact = { ...baseCustomer, contactName: null }
    const msg = buildInvoiceMessage(baseStore, baseInvoice, noContact)
    expect(msg.split('\n')[0]).toBe('Hi ACME Logistics,')
  })

  it('says "tax invoice" only for VAT-registered stores', () => {
    const nonVat = buildInvoiceMessage(baseStore, baseInvoice, baseCustomer)
    expect(nonVat).toContain('invoice from Soweto Spaza')
    expect(nonVat).not.toContain('tax invoice')

    const vatStore = { ...baseStore, vatRegistered: true, vatNumber: '4123' }
    const vat = buildInvoiceMessage(vatStore, baseInvoice, baseCustomer)
    expect(vat).toContain('tax invoice from Soweto Spaza')
  })

  it('includes invoice number in INV-00007 format', () => {
    expect(buildInvoiceMessage(baseStore, baseInvoice, baseCustomer)).toContain('Invoice: INV-00007')
  })

  it('lists each line item with qty × name and total', () => {
    const msg = buildInvoiceMessage(baseStore, baseInvoice, baseCustomer)
    expect(msg).toContain('10× White Bread (700g) — R169.90')
    expect(msg).toContain('5× Coke 2L — R149.95')
  })

  it('shows VAT subtotal + VAT line only for VAT-registered stores', () => {
    const vatStore = { ...baseStore, vatRegistered: true }
    const vatInvoice = { ...baseInvoice, subtotalExcl: 278.13, vatAmount: 41.72, total: 319.85 }
    const msg = buildInvoiceMessage(vatStore, vatInvoice, baseCustomer)
    expect(msg).toContain('Subtotal (excl. VAT): R278.13')
    expect(msg).toContain('VAT: R41.72')

    const nonVatMsg = buildInvoiceMessage(baseStore, baseInvoice, baseCustomer)
    expect(nonVatMsg).not.toContain('Subtotal (excl. VAT)')
    expect(nonVatMsg).not.toMatch(/^VAT: /m)
  })

  it('shows paid + balance lines only when there has been a payment', () => {
    const partial = { ...baseInvoice, amountPaid: 100 }
    const msg = buildInvoiceMessage(baseStore, partial, baseCustomer)
    expect(msg).toContain('Paid: R100.00')
    expect(msg).toContain('Balance: R219.85')

    const noPayment = buildInvoiceMessage(baseStore, baseInvoice, baseCustomer)
    expect(noPayment).not.toContain('Paid:')
    expect(noPayment).not.toContain('Balance:')
  })

  it('appends VAT number, business address, and phone when present', () => {
    const fullStore = {
      ...baseStore,
      vatRegistered: true,
      vatNumber: '4123456789',
      businessAddress: '5 Nelson St, Cape Town',
      phone: '0218889999',
    }
    const msg = buildInvoiceMessage(fullStore, baseInvoice, baseCustomer)
    expect(msg).toContain('VAT No: 4123456789')
    expect(msg).toContain('5 Nelson St, Cape Town')
    expect(msg).toContain('Tel: 0218889999')
  })
})

describe('buildMailtoUrl', () => {
  it('returns empty string when customer has no email', () => {
    const noEmail = { ...baseCustomer, email: null }
    expect(buildMailtoUrl(baseStore, baseInvoice, noEmail)).toBe('')
  })

  it('returns empty string when customer is null', () => {
    expect(buildMailtoUrl(baseStore, baseInvoice, null)).toBe('')
  })

  it('builds a valid mailto: URL with subject and body URL-encoded', () => {
    const url = buildMailtoUrl(baseStore, baseInvoice, baseCustomer)
    expect(url.startsWith('mailto:')).toBe(true)
    expect(url).toContain('jane%40acme.co.za')
    expect(url).toContain('subject=INV-00007')
    expect(url).toContain('body=')
  })
})

describe('buildWhatsAppUrl', () => {
  it('returns empty string when customer has no phone', () => {
    const noPhone = { ...baseCustomer, phone: null }
    expect(buildWhatsAppUrl(baseStore, baseInvoice, noPhone)).toBe('')
  })

  it('returns empty string when customer is null', () => {
    expect(buildWhatsAppUrl(baseStore, baseInvoice, null)).toBe('')
  })

  it('normalizes SA phones to international format in the URL', () => {
    // 0823334444 → 27823334444
    const url = buildWhatsAppUrl(baseStore, baseInvoice, baseCustomer)
    expect(url.startsWith('https://wa.me/27823334444?text=')).toBe(true)
  })

  it('URL-encodes the message body', () => {
    const url = buildWhatsAppUrl(baseStore, baseInvoice, baseCustomer)
    // Should not contain literal newlines / spaces in the URL — encoded
    expect(url).not.toMatch(/\n/)
    expect(url).toMatch(/text=Hi%20Jane/)
  })
})
