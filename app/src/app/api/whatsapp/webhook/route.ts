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
import { rateLimitByIp } from '@/lib/rate-limit'
import { checkAdvisorBudget, checkGlobalAdvisorBudget, recordAdvisorUse } from '@/lib/ai-cost-meter'
import { effectivePlan } from '@/lib/effective-plan'

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
  // IP-based throttle BEFORE signature check — discards floods of
  // unsigned payloads without spending CPU on HMAC. Meta's legit
  // delivery rate is low (a few per second worst case); 120/min is
  // generous. Adjust via env if it ever trips on real traffic.
  const ipBlock = await rateLimitByIp(req, 'whatsapp_webhook', Number(process.env.WHATSAPP_RATE_LIMIT_PER_MIN ?? 120))
  if (ipBlock) return ipBlock

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

    default: {
      // Route conversational queries through Claude with full data access.
      // Pass the store owner's id as the conversation memory key — the
      // WhatsApp message comes in by phone number, so we use the owner
      // (matched by stores.whatsapp_number) as the user-of-record.
      //
      // Rate-limit guards BEFORE hitting the LLM — closes the loophole
      // where WhatsApp abuse could bypass the advisor quota (the /api/advisor
      // route enforces these; without this the WhatsApp path was
      // effectively uncapped for LLM cost).
      const globalBudget = await checkGlobalAdvisorBudget(supabase)
      if (!globalBudget.ok) return globalBudget.message ?? 'Stoki AI is taking a short break — try again later.'

      const plan = effectivePlan(store)
      const userBudget = await checkAdvisorBudget(supabase, store.ownerId, plan)
      if (!userBudget.ok) return userBudget.message ?? `You've hit today's Stoki AI limit — resets at midnight.`

      const reply = await askBrain(supabase, store, text, store.ownerId)
      // Increment on success (fire-and-forget). Refusals still count —
      // deliberate: quota burn discourages repeated off-topic prodding.
      void recordAdvisorUse(supabase, store.ownerId)
      return reply
    }
  }
}
