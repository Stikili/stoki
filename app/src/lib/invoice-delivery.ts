import { Invoice, balanceOf } from '@/domain/entities/invoice'
import { Store } from '@/domain/entities/store'
import { Customer } from '@/domain/entities/customer'
import { normalizeZAPhone } from '@/lib/whatsapp'

function fmtInvoiceNo(n: number): string {
  return `INV-${String(n).padStart(5, '0')}`
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMoney(n: number): string {
  return `R${n.toFixed(2)}`
}

/** Plain-text body of an invoice — used for both email and WhatsApp delivery. */
export function buildInvoiceMessage(store: Store, invoice: Invoice, customer: Customer | null): string {
  const lines: string[] = []
  lines.push(`Hi${customer?.contactName ? ' ' + customer.contactName : customer ? ' ' + customer.name : ''},`)
  lines.push('')
  lines.push(`Please find your ${store.vatRegistered ? 'tax invoice' : 'invoice'} from ${store.name}:`)
  lines.push('')
  lines.push(`Invoice: ${fmtInvoiceNo(invoice.invoiceNumber)}`)
  lines.push(`Issued: ${fmtDate(invoice.issuedAt)}`)
  lines.push(`Due: ${fmtDate(invoice.dueAt)}`)
  lines.push('')
  for (const item of invoice.lineItems) {
    lines.push(`${item.qty}× ${item.description} — ${fmtMoney(item.unitPrice * item.qty)}`)
  }
  lines.push('─'.repeat(28))
  if (store.vatRegistered) {
    lines.push(`Subtotal (excl. VAT): ${fmtMoney(invoice.subtotalExcl)}`)
    lines.push(`VAT: ${fmtMoney(invoice.vatAmount)}`)
  }
  lines.push(`Total: ${fmtMoney(invoice.total)}`)
  const balance = balanceOf(invoice)
  if (invoice.amountPaid > 0) {
    lines.push(`Paid: ${fmtMoney(invoice.amountPaid)}`)
    lines.push(`Balance: ${fmtMoney(balance)}`)
  }
  lines.push('')
  if (store.vatRegistered && store.vatNumber) lines.push(`VAT No: ${store.vatNumber}`)
  if (store.businessAddress) lines.push(store.businessAddress)
  if (store.phone) lines.push(`Tel: ${store.phone}`)
  lines.push('')
  lines.push('Thank you for your business!')
  return lines.join('\n')
}

/** Build a `mailto:` URL with the invoice body and a clear subject line. */
export function buildMailtoUrl(store: Store, invoice: Invoice, customer: Customer | null): string {
  if (!customer?.email) return ''
  const subject = `${fmtInvoiceNo(invoice.invoiceNumber)} from ${store.name}`
  const body = buildInvoiceMessage(store, invoice, customer)
  return `mailto:${encodeURIComponent(customer.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/** Build a `https://wa.me/<phone>?text=` URL. Phone is normalised to SA international format. */
export function buildWhatsAppUrl(store: Store, invoice: Invoice, customer: Customer | null): string {
  if (!customer?.phone) return ''
  const phone = normalizeZAPhone(customer.phone)
  if (!phone) return ''
  const body = buildInvoiceMessage(store, invoice, customer)
  return `https://wa.me/${phone}?text=${encodeURIComponent(body)}`
}
