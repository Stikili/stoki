'use client'

interface ReceiptItem {
  name: string
  qty: number
  price: number
}

interface ReceiptProps {
  storeName: string
  items: ReceiptItem[]
  total: number
  date: string
  onClose: () => void
}

export default function Receipt({ storeName, items, total, date, onClose }: ReceiptProps) {
  function generateText() {
    const lines = [
      `--- ${storeName} ---`,
      date,
      '',
      ...items.map((i) => `${i.qty}× ${i.name}  R${(i.price * i.qty).toFixed(2)}`),
      '─'.repeat(28),
      `TOTAL: R${total.toFixed(2)}`,
      '',
      'Thank you for your purchase!',
      `Powered by stoki`,
    ]
    return lines.join('\n')
  }

  async function share() {
    const text = generateText()
    if (navigator.share) {
      try {
        await navigator.share({ title: `Receipt - ${storeName}`, text })
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
        {/* Receipt body */}
        <div className="p-6">
          <div className="text-center mb-4">
            <p className="font-bold text-lg">{storeName}</p>
            <p className="text-xs text-gray-500 mt-1">{date}</p>
          </div>

          <div className="border-t border-dashed border-gray-300 my-3" />

          {items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm py-1">
              <span>{item.qty}× {item.name}</span>
              <span className="font-semibold">R{(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}

          <div className="border-t border-dashed border-gray-300 my-3" />

          <div className="flex justify-between font-bold text-lg">
            <span>TOTAL</span>
            <span>R{total.toFixed(2)}</span>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">Thank you for your purchase!</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 pt-0">
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
      </div>
    </div>
  )
}
