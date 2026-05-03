import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Seed a demo store for `userId` with realistic SA-spaza-shop data:
 *   - 12 stocked products with typical-area prices
 *   - 5 debtors with credit balances + 1 overdue
 *   - ~28 sales spread over the last 7 days (so the dashboard chart lives)
 *   - 2 month-to-date expenses (rent + transport)
 *
 * Idempotent at the call site (caller checks user_metadata first). Returns
 * the created store id so the caller can decide whether to switch to it.
 *
 * All inserts go through the user's own Supabase client — RLS still applies
 * because we set owner_id = userId. No service-role escalation needed.
 */
export async function seedDemoStore(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const now = new Date()

  // 1. Store header — flagged is_demo so the UI can badge it and we can keep
  // it out of any "real-business" automations later.
  const { data: store, error: storeErr } = await supabase
    .from('stores')
    .insert({
      owner_id: userId,
      name: 'Stoki Demo Shop',
      phone: '+27821234567',
      plan: 'free',
      timezone: 'Africa/Johannesburg',
      category: 'spaza',
      location: 'Soweto',
      onboarding_completed: true,
      is_demo: true,
    })
    .select()
    .single()
  if (storeErr || !store) throw new Error(storeErr?.message ?? 'Failed to create demo store')
  const storeId: string = store.id

  // 2. Membership — owner role on the new store. Wrapped in try/catch so
  // pre-migration-008 environments still succeed (RLS via owner_id only).
  try {
    await supabase.from('store_users').insert({
      store_id: storeId,
      user_id: userId,
      role: 'owner',
      invited_by: userId,
    })
  } catch { /* membership table may not exist yet; non-fatal */ }

  // 3. Products — keep cost/price realistic so margins look plausible on the
  // dashboard, and pick names a returning user would recognise from any
  // spaza shop they've walked into.
  const productSeed = [
    { name: 'White Bread (700g)',      price: 16.99, cost: 12.00, qty: 24, reorder_point: 10 },
    { name: 'Brown Bread (700g)',      price: 14.99, cost: 10.50, qty: 18, reorder_point: 10 },
    { name: 'Milk (1L)',               price: 22.00, cost: 16.00, qty: 12, reorder_point: 6  },
    { name: 'Sugar (2.5kg)',           price: 55.00, cost: 42.00, qty: 8,  reorder_point: 4  },
    { name: 'Rice (2kg)',              price: 45.00, cost: 32.00, qty: 9,  reorder_point: 4  },
    { name: 'Cooking Oil (750ml)',     price: 45.00, cost: 33.00, qty: 11, reorder_point: 5  },
    { name: 'Eggs (dozen)',            price: 50.00, cost: 38.00, qty: 7,  reorder_point: 4  },
    { name: 'Maggi 2-min Noodles',     price: 5.00,  cost: 3.00,  qty: 80, reorder_point: 30 },
    { name: 'Simba Chips',             price: 10.00, cost: 6.50,  qty: 40, reorder_point: 20 },
    { name: 'Coke 330ml Can',          price: 15.00, cost: 10.00, qty: 32, reorder_point: 15 },
    { name: 'Sunlight Bar Soap',       price: 12.00, cost: 8.00,  qty: 25, reorder_point: 10 },
    { name: 'OMO 500g',                price: 45.00, cost: 32.00, qty: 6,  reorder_point: 4  },
  ]
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .insert(productSeed.map((p) => ({ store_id: storeId, ...p })))
    .select('id, price, cost')
  if (prodErr || !products) throw new Error(prodErr?.message ?? 'Failed to seed products')

  // 4. Debtors — informal trade credit. One overdue (created 21 days ago)
  // so the credit hero on the dashboard has something interesting to show.
  const twentyOneDaysAgo = new Date(now); twentyOneDaysAgo.setDate(twentyOneDaysAgo.getDate() - 21)
  const debtorSeed = [
    { name: 'Mama Naledi',     phone: '0823334444', address: '12 Vilakazi St, Orlando West', total_owed: 250 },
    { name: 'Joseph Mokoena',  phone: '0827778888', address: '45 Khumalo Rd, Pimville',       total_owed: 120 },
    { name: 'Sis Tracy',       phone: '0825556666', address: 'Stand 1432, Diepkloof',         total_owed: 80  },
    { name: 'Bra Cele',        phone: '0824443333', address: null,                            total_owed: 350, created_at: twentyOneDaysAgo.toISOString() },
    { name: 'Lerato Dlamini',  phone: '0821112222', address: '8 Nelson Mandela Dr',           total_owed: 60  },
  ]
  const { data: debtors } = await supabase
    .from('debtors')
    .insert(debtorSeed.map((d) => ({ store_id: storeId, ...d })))
    .select('id, total_owed')

  // 5. Credit entries — pair each debtor with a description so the credit
  // sheet looks like a real ledger. Skipped quietly if the columns aren't
  // there yet (pre-migration-016).
  if (debtors) {
    const descriptions = ['Bread, milk, sugar', 'Airtime + chips', 'Cooking oil + rice', 'Soap + Coke ×3', 'Eggs + maggi']
    try {
      await supabase.from('credit_entries').insert(
        debtors.map((d, i) => ({
          store_id: storeId,
          debtor_id: d.id,
          amount: d.total_owed,
          description: descriptions[i] ?? null,
        })),
      )
    } catch { /* credit_entries.description optional */ }
  }

  // 6. Sales over the last 7 days. Gives the dashboard's 7-day chart
  // something to render and lets the cashup / reports pages show real
  // numbers immediately. ~3-5 sales per day, varied products + payment
  // methods, sale times spread across opening hours.
  const paymentMethods = ['cash', 'cash', 'cash', 'card', 'snapscan'] as const
  const sales: Array<Record<string, unknown>> = []
  const rng = mulberry32(0xC1F5)
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = new Date(now); date.setDate(date.getDate() - dayOffset)
    const salesToday = 3 + Math.floor(rng() * 3) // 3..5
    for (let s = 0; s < salesToday; s++) {
      const product = products[Math.floor(rng() * products.length)]
      const qty = 1 + Math.floor(rng() * 3) // 1..3
      const recordedAt = new Date(date)
      recordedAt.setHours(8 + Math.floor(rng() * 10), Math.floor(rng() * 60), 0, 0)
      sales.push({
        store_id: storeId,
        product_id: product.id,
        qty,
        price_at_sale: product.price,
        cost_at_sale: product.cost,
        type: 'sale',
        channel: 'app',
        payment_method: paymentMethods[Math.floor(rng() * paymentMethods.length)],
        recorded_at: recordedAt.toISOString(),
      })
    }
  }
  await supabase.from('sales').insert(sales)

  // 7. Expenses — month-to-date so the P&L isn't pure profit.
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastWeek = new Date(now); lastWeek.setDate(lastWeek.getDate() - 4)
  await supabase.from('expenses').insert([
    {
      store_id: storeId,
      category: 'rent',
      description: 'Shop rent',
      amount: 1500,
      recorded_at: monthStart.toISOString(),
    },
    {
      store_id: storeId,
      category: 'transport',
      description: 'Stock pickup — Maponya Mall',
      amount: 250,
      recorded_at: lastWeek.toISOString(),
    },
  ])

  return storeId
}

/** Tiny seedable PRNG so demo data is reproducible across renders.
 *  mulberry32 is fine for "looks varied" purposes — it's not for cryptography. */
function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
