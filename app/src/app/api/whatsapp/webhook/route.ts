import { NextResponse } from 'next/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { ProductRepository } from '@/infrastructure/supabase/repositories/ProductRepository'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { DebtorRepository } from '@/infrastructure/supabase/repositories/DebtorRepository'
import { AlertRepository } from '@/infrastructure/supabase/repositories/AlertRepository'
import { recordSale } from '@/application/sales/recordSale'
import { getProducts } from '@/application/inventory/getProducts'
import { parseCommand, fuzzyMatch } from '@/lib/whatsapp-parser'
import { validateTwilioSignature } from '@/lib/twilio'

function twiml(message: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`
  return new NextResponse(xml, { headers: { 'Content-Type': 'text/xml' } })
}

function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function POST(req: Request) {
  const body = await req.text()
  const params = Object.fromEntries(new URLSearchParams(body))

  // Validate Twilio signature in production
  if (process.env.NODE_ENV === 'production') {
    const sig = req.headers.get('x-twilio-signature') ?? ''
    const url = `${process.env.NEXT_PUBLIC_SITE_URL}/api/whatsapp/webhook`
    if (!validateTwilioSignature(url, params, sig)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }
  }

  const from = (params.From ?? '').replace('whatsapp:', '').replace('+', '')
  const text = params.Body ?? ''

  if (!from || !text) return twiml('Send "help" for commands.')

  const supabase = createAdminClient()
  const storeRepo = new StoreRepository(supabase)

  // Look up store by WhatsApp number
  const store = await storeRepo.findByWhatsAppNumber(from)
  if (!store) {
    return twiml('No store linked to this number. Open stoki Settings and add your WhatsApp number.')
  }

  const cmd = parseCommand(text)

  switch (cmd.command) {
    case 'help': {
      return twiml(
        'Stoki Commands:\n' +
        '• sell [product] [qty] — record a sale\n' +
        '• stock — check low stock\n' +
        '• credit — who owes you\n' +
        '• today — today\'s sales\n' +
        '• help — this message'
      )
    }

    case 'today': {
      const saleRepo = new SaleRepository(supabase)
      const now = new Date()
      const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999)
      const summary = await saleRepo.summarise(store.id, dayStart, dayEnd)
      return twiml(
        `📊 Today at ${store.name}:\n` +
        `Revenue: R${summary.totalRevenue.toFixed(2)}\n` +
        `Sales: ${summary.transactionCount}\n` +
        `Items: ${summary.itemsSold}\n` +
        (summary.totalMargin > 0 ? `Profit: R${summary.totalMargin.toFixed(2)}` : '')
      )
    }

    case 'stock': {
      const productRepo = new ProductRepository(supabase)
      const products = await getProducts(productRepo, store.id)
      const low = products.filter(p => p.status === 'low' || p.status === 'out')
      if (low.length === 0) return twiml('All stock levels good! 👍')
      const lines = low.slice(0, 10).map(p =>
        `${p.status === 'out' ? '🔴' : '🟡'} ${p.name}: ${p.qty} left`
      )
      return twiml(`Stock alerts (${low.length}):\n${lines.join('\n')}`)
    }

    case 'credit': {
      const debtorRepo = new DebtorRepository(supabase)
      const debtors = await debtorRepo.findAll(store.id)
      const owing = debtors.filter(d => d.totalOwed > 0)
      if (owing.length === 0) return twiml('No one owes you! 🎉')
      const total = owing.reduce((s, d) => s + d.totalOwed, 0)
      const lines = owing.slice(0, 10).map(d => `• ${d.name}: R${d.totalOwed.toFixed(2)}`)
      return twiml(`💳 R${total.toFixed(2)} owed by ${owing.length} customers:\n${lines.join('\n')}`)
    }

    case 'sell': {
      if (!cmd.product) return twiml('Usage: sell [product] [qty]\nExample: sell bread 3')
      const productRepo = new ProductRepository(supabase)
      const products = await getProducts(productRepo, store.id)
      const match = fuzzyMatch(cmd.product, products.map(p => ({ id: p.id, name: p.name })))
      if (!match) return twiml(`Can't find "${cmd.product}". Check spelling or type "stock" to see products.`)

      const product = products.find(p => p.id === match.id)!
      const qty = cmd.qty ?? 1
      if (product.qty < qty) return twiml(`Only ${product.qty} ${product.name} in stock.`)

      const saleRepo = new SaleRepository(supabase)
      const alertRepo = new AlertRepository(supabase)
      await recordSale(saleRepo, productRepo, alertRepo, store.id, {
        productId: product.id,
        qty,
        priceAtSale: product.price,
        channel: 'whatsapp',
      })

      const total = product.price * qty
      return twiml(`✅ Sold ${qty}× ${product.name} — R${total.toFixed(2)}\nStock left: ${product.qty - qty}`)
    }

    default:
      return twiml('I didn\'t understand that. Send "help" for commands.')
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Stoki WhatsApp bot is running' })
}
