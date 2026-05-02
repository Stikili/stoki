'use client'

interface ReceiptItem {
  name: string
  qty: number
  price: number
  /** Optional VAT amount for this line. Only relevant when the store is VAT-registered. */
  vat?: number
  /** Whether the line price already includes VAT (SA retail standard). Defaults to true. */
  vatInclusive?: boolean
}

interface ReceiptProps {
  storeName: string
  items: ReceiptItem[]
  total: number
  date: string
  onClose: () => void
  /** Optional: triggered by "New sale" — closes the receipt and signals the
   *  parent to reset the cart for the next transaction. */
  onNewSale?: () => void
  /** Sequential invoice number (per-store). Required for SARS-compliant tax invoices. */
  invoiceNumber?: number | null
  /** Store-level VAT info — receipt becomes a TAX INVOICE when present. */
  vatRegistered?: boolean
  vatNumber?: string | null
  vatRate?: number
  businessAddress?: string | null
  businessPhone?: string | null
}

function formatInvoiceNumber(n: number): string {
  return `INV-${String(n).padStart(5, '0')}`
}

export default function Receipt({
  storeName,
  items,
  total,
  date,
  onClose,
  onNewSale,
  invoiceNumber,
  vatRegistered = false,
  vatNumber,
  vatRate = 15,
  businessAddress,
  businessPhone,
}: ReceiptProps) {
  // VAT totals across the basket. If the seller is VAT-registered we always show
  // a breakdown — falling back to extracting the implied 15/115 portion if individual
  // line VAT amounts weren't passed in.
  const vatBasketTotal = vatRegistered
    ? items.reduce((sum, item) => {
        if (typeof item.vat === 'number') return sum + item.vat
        const inclusive = item.vatInclusive !== false
        const lineTotal = item.price * item.qty
        const rate = vatRate / 100
        return sum + (inclusive ? lineTotal - lineTotal / (1 + rate) : lineTotal * rate)
      }, 0)
    : 0
  const subtotalExcl = vatRegistered ? total - vatBasketTotal : total

  const headerLabel = vatRegistered ? 'TAX INVOICE' : 'Receipt'
  const numberLabel = invoiceNumber != null
    ? formatInvoiceNumber(invoiceNumber)
    : null

  function generateText() {
    const lines = [
      `--- ${storeName} ---`,
      headerLabel,
      ...(numberLabel ? [`No: ${numberLabel}`] : []),
      ...(vatRegistered && vatNumber ? [`VAT No: ${vatNumber}`] : []),
      ...(businessAddress ? [businessAddress] : []),
      date,
      '',
      ...items.map(i => `${i.qty}× ${i.name}  R${(i.price * i.qty).toFixed(2)}`),
      '─'.repeat(28),
      ...(vatRegistered ? [
        `Subtotal (excl. VAT): R${subtotalExcl.toFixed(2)}`,
        `VAT @ ${vatRate.toFixed(0)}%: R${vatBasketTotal.toFixed(2)}`,
      ] : []),
      `TOTAL: R${total.toFixed(2)}`,
      '',
      'Thank you for your purchase!',
      'Powered by stoki',
    ]
    return lines.join('\n')
  }

  async function share() {
    const text = generateText()
    if (navigator.share) {
      try {
        await navigator.share({ title: `${headerLabel} — ${storeName}`, text })
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text)
      alert('Receipt copied to clipboard!')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-3xl overflow-hidden" style={{ background: '#fafaf5', color: '#222' }}>
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-3">
            <p className="font-bold text-lg">{storeName}</p>
            {businessAddress && (
              <p className="text-[11px] text-gray-500 leading-tight whitespace-pre-line mt-0.5">{businessAddress}</p>
            )}
            {businessPhone && (
              <p className="text-[11px] text-gray-500 mt-0.5">Tel: {businessPhone}</p>
            )}
            {vatRegistered && vatNumber && (
              <p className="text-[11px] text-gray-500 mt-0.5">VAT No: {vatNumber}</p>
            )}
            <p className="text-xs font-bold tracking-widest mt-2 uppercase">{headerLabel}</p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500">
            {numberLabel && <span>{numberLabel}</span>}
            <span>{date}</span>
          </div>

          <div className="border-t border-dashed border-gray-300 my-3" />

          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span>{item.qty}× {item.name}</span>
              <span className="font-semibold">R{(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}

          <div className="border-t border-dashed border-gray-300 my-3" />

          {vatRegistered && (
            <>
              <div className="flex justify-between text-xs text-gray-600 py-0.5">
                <span>Subtotal (excl. VAT)</span>
                <span>R{subtotalExcl.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600 py-0.5">
                <span>VAT @ {vatRate.toFixed(0)}%</span>
                <span>R{vatBasketTotal.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-300 my-2" />
            </>
          )}

          <div className="flex justify-between font-bold text-lg">
            <span>TOTAL</span>
            <span>R{total.toFixed(2)}</span>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">Thank you for your purchase!</p>
          <p className="text-center text-[10px] text-gray-400">Powered by stoki</p>
        </div>

        <div className="flex flex-col gap-2 p-4 pt-0">
          <div className="flex gap-2">
            <button
              onClick={share}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-white"
              style={{ background: '#25D366' }}
            >
              Share Receipt
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl font-semibold text-sm"
              style={{ background: '#e5e7eb', color: '#374151' }}
            >
              Done
            </button>
          </div>
          {onNewSale && (
            <button
              onClick={onNewSale}
              className="w-full py-3 rounded-xl font-bold text-sm text-white"
              style={{ background: '#00C896' }}
            >
              + New Sale
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
