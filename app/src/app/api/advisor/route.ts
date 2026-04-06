import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/infrastructure/supabase/server'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { getCachedProducts, getCachedDebtors } from '@/lib/cached-queries'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Advisor not configured' }, { status: 503 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { messages, storeId } = body

  const storeRepo = new StoreRepository(supabase)
  const allStores = await storeRepo.findAllByOwner(user.id)
  if (!allStores.length) return NextResponse.json({ error: 'No store' }, { status: 404 })
  const store = allStores.find((s) => s.id === storeId) ?? allStores[0]

  const saleRepo = new SaleRepository(supabase)

  const now = new Date()
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999)
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 6); weekStart.setHours(0, 0, 0, 0)

  // Products + debtors from cache; sales always fresh for accurate advice
  const [productsWithStatus, debtors, todaySales, weekSales] = await Promise.all([
    getCachedProducts(store.id),
    getCachedDebtors(store.id),
    saleRepo.summarise(store.id, dayStart, dayEnd),
    saleRepo.summarise(store.id, weekStart, dayEnd),
  ])
  const lowStock = productsWithStatus.filter((p) => p.status === 'low' || p.status === 'out')
  const totalOwed = debtors.reduce((sum, d) => sum + d.totalOwed, 0)

  const categoryLabels: Record<string, string> = {
    spaza: 'spaza shop',
    general_dealer: 'general dealer',
    food_stall: 'food stall',
    other: 'shop',
  }
  const storeType = categoryLabels[store.category ?? 'other'] ?? 'shop'
  const locationContext = store.location
    ? `Location: ${store.location}, South Africa.`
    : 'Location: South Africa (area not specified).'

  const systemPrompt = `You are stoki, an AI business advisor built into the stoki app. You are advising the owner of ${store.name}, a ${storeType} in South Africa. ${locationContext}

Be concise, practical, and speak plainly in the South African township/SMME context. Use Rands (R) for currency. Keep answers conversational — no bullet points, no markdown headers. Tailor advice to the local market: reference relevant suppliers, pricing norms, seasonal patterns, and community dynamics for the owner's area where possible.

Current store data:
- Store: ${store.name} (${storeType})
- ${locationContext}
- Today's revenue: R${todaySales.totalRevenue.toFixed(2)} (${todaySales.transactionCount} sales, ${todaySales.itemsSold} items sold)
- This week's revenue: R${weekSales.totalRevenue.toFixed(2)} (${weekSales.transactionCount} sales)
- Inventory: ${productsWithStatus.length} products total
- Low/out of stock: ${lowStock.length > 0 ? lowStock.map((p) => `${p.name} (${p.qty} left)`).join(', ') : 'none'}
- Credit book: R${totalOwed.toFixed(2)} outstanding across ${debtors.filter((d) => d.totalOwed > 0).length} customers
- Biggest debtors: ${debtors.slice(0, 3).map((d) => `${d.name} owes R${d.totalOwed.toFixed(2)}`).join('; ') || 'none'}
- Top products by margin: ${productsWithStatus.sort((a, b) => b.margin - a.margin).slice(0, 3).map((p) => `${p.name} (R${p.margin.toFixed(2)} margin)`).join(', ') || 'none'}

Give actionable advice. Keep answers under 3 sentences unless the question genuinely needs more.`

  // Validate message alternation (Claude requires user/assistant turns to alternate)
  const validMessages = messages.filter(
    (m: { role: string; content: string }) => m.role === 'user' || m.role === 'assistant'
  )

  const anthropic = new Anthropic({ apiKey })
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: validMessages,
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return NextResponse.json({ message: text })
}
