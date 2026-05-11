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
import { sendWhatsAppText, validateMetaSignature, extractIncomingMessage } from '@/lib/whatsapp'
import { askBrain } from '@/lib/whatsapp-brain'

// Meta webhook verification handshake.
// Configured during webhook setup in Meta App Dashboard.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? '', { status: 200 })
  }
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

export async function POST(req: Request) {
  const rawBody = await req.text()

  // Always validate when the secret is set — including staging deployments.
  // Skipping signature checks on non-prod made publicly-reachable staging URLs
  // accept any payload from anyone.
  if (process.env.META_APP_SECRET) {
    const sig = req.headers.get('x-hub-signature-256')
    if (!validateMetaSignature(rawBody, sig)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }
  }

  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ ok: true })
  }

  const incoming = extractIncomingMessage(payload)
  // Status updates, delivery receipts, etc. — acknowledge and ignore.
  if (!incoming) return NextResponse.json({ ok: true })

  const { from, text } = incoming

  // Acknowledge Meta first; reply asynchronously via API.
  // Wrapping in try/catch so a send failure doesn't return 500 and trigger Meta retries.
  try {
    const reply = await handleCommand(from, text)
    if (reply) await sendWhatsAppText(from, reply)
  } catch (err) {
    console.error('[whatsapp webhook]', err)
  }

  return NextResponse.json({ ok: true })
}

async function handleCommand(from: string, text: string): Promise<string | null> {
  const supabase = createAdminClient()
  const storeRepo = new StoreRepository(supabase)

  const store = await storeRepo.findByWhatsAppNumber(from)
  if (!store) {
    return 'No store linked to this number. Open stoki Settings and add your WhatsApp number.'
  }

  const cmd = parseCommand(text)

  switch (cmd.command) {
    case 'help': {
      return (
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
      return (
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
      if (low.length === 0) return 'All stock levels good! 👍'
      const lines = low.slice(0, 10).map(p =>
        `${p.status === 'out' ? '🔴' : '🟡'} ${p.name}: ${p.qty} left`,
      )
      return `Stock alerts (${low.length}):\n${lines.join('\n')}`
    }

    case 'credit': {
      const debtorRepo = new DebtorRepository(supabase)
      const debtors = await debtorRepo.findAll(store.id)
      const owing = debtors.filter(d => d.totalOwed > 0)
      if (owing.length === 0) return 'No one owes you! 🎉'
      const total = owing.reduce((s, d) => s + d.totalOwed, 0)
      const lines = owing.slice(0, 10).map(d => `• ${d.name}: R${d.totalOwed.toFixed(2)}`)
      return `💳 R${total.toFixed(2)} owed by ${owing.length} customers:\n${lines.join('\n')}`
    }

    case 'sell': {
      if (!cmd.product) return 'Usage: sell [product] [qty]\nExample: sell bread 3'
      const productRepo = new ProductRepository(supabase)
      const products = await getProducts(productRepo, store.id)
      const match = fuzzyMatch(cmd.product, products.map(p => ({ id: p.id, name: p.name })))
      if (!match) return `Can't find "${cmd.product}". Check spelling or type "stock" to see products.`

      const product = products.find(p => p.id === match.id)!
      const qty = cmd.qty ?? 1
      if (product.qty < qty) return `Only ${product.qty} ${product.name} in stock.`

      const saleRepo = new SaleRepository(supabase)
      const alertRepo = new AlertRepository(supabase)
      await recordSale(saleRepo, productRepo, alertRepo, store, {
        productId: product.id,
        qty,
        priceAtSale: product.price,
        channel: 'whatsapp',
      })

      const total = product.price * qty
      return `✅ Sold ${qty}× ${product.name} — R${total.toFixed(2)}\nStock left: ${product.qty - qty}`
    }

    default:
      // Route conversational queries through Claude with full data access.
      // Pass the store owner's id as the conversation memory key — the
      // WhatsApp message comes in by phone number, so we use the owner
      // (matched by stores.whatsapp_number) as the user-of-record.
      return askBrain(supabase, store, text, store.ownerId)
  }
}
