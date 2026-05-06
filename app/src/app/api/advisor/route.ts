import { NextRequest, NextResponse } from 'next/server'
// Default export aliased — keeps the rest of this file provider-agnostic.
// Swap the package + this single import line if/when we change LLM vendors.
import LLMClient from '@anthropic-ai/sdk'
import { createClient } from '@/infrastructure/supabase/server'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { getCachedProducts, getCachedDebtors } from '@/lib/cached-queries'
import { LLM_API_KEY, LLM_MODEL } from '@/lib/llm-config'
import { checkAdvisorBudget, recordAdvisorUse } from '@/lib/ai-cost-meter'
import { relevantAdvisorContext } from '@/application/advisor/features'

export async function POST(req: NextRequest) {
  const apiKey = LLM_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Advisor not configured' }, { status: 503 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Per-user daily message cap. Surfaces a friendly throttle message on
  // free-tier accounts that would otherwise burn LLM budget.
  const budget = await checkAdvisorBudget(supabase, user.id)
  if (!budget.ok) {
    return NextResponse.json({ message: budget.message, throttled: true })
  }

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

  // Pull only the AI-economic-intelligence feature blocks relevant to the
  // current user message — keyword-gated so we don't pay LLM tokens for the
  // full pack on every question.
  const lastUserMessage = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]?.role === 'user') return String(messages[i].content ?? '')
    }
    return ''
  })()
  const featureContext = await relevantAdvisorContext(supabase, store, lastUserMessage)

  const systemPrompt = `You are stoki insight, the business insight assistant built into the stoki app. You are advising the owner of ${store.name}, a ${storeType} in South Africa. ${locationContext}

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

${featureContext ? `\n## Feature-specific context relevant to the question\n\n${featureContext}\n` : ''}
Give actionable advice. Keep answers under 3 sentences unless the question genuinely needs more.`

  // Validate message alternation — the LLM API requires user/assistant
  // turns to alternate, so any system / tool messages get filtered out.
  const validMessages = messages.filter(
    (m: { role: string; content: string }) => m.role === 'user' || m.role === 'assistant'
  )

  const ai = new LLMClient({ apiKey })
  const response = await ai.messages.create({
    model: LLM_MODEL,
    max_tokens: 1024,
    system: systemPrompt,
    messages: validMessages,
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''

  // Increment the per-user daily counter only on a successful LLM response.
  // We don't await — the response is what the user is waiting for.
  void recordAdvisorUse(supabase, user.id)

  return NextResponse.json({ message: text })
}
