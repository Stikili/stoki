import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Seed two distinct demo stores per user so they can compare verticals and
 * see every Stoki feature populated with realistic data:
 *
 *   1. "Stoki Demo Spaza"  — Soweto, not VAT-registered. Informal trade
 *                            credit, airtime PINs, a combo bundle, a
 *                            weighable item, and short-tail fast-mover SKUs.
 *
 *   2. "Stoki Demo Market" — Cape Town, VAT-registered at 15%. B2B
 *                            customers + invoices (incl. partially paid +
 *                            overdue), broader catalogue with weighable
 *                            produce, scheduled-delivery flows.
 *
 * Both stores carry: products (regular + airtime + bundle + weighable),
 * suppliers, restocks, wastage, sales over 7 days with mixed payment
 * methods, expenses across categories, a stocktake snapshot, alerts, and
 * a handful of unsold airtime PINs.
 *
 * Idempotent at the call site (caller checks user_metadata first).
 */
export async function seedDemoStores(
  supabase: SupabaseClient,
  userId: string,
): Promise<string[]> {
  const ids: string[] = []
  for (const profile of DEMO_PROFILES) {
    const id = await seedOne(supabase, userId, profile)
    ids.push(id)
  }
  return ids
}

/** Backwards-compatible wrapper — older callers expecting a single store id
 *  still get a useful return (the first store created). */
export async function seedDemoStore(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const ids = await seedDemoStores(supabase, userId)
  return ids[0]
}

// ── Profile definitions ────────────────────────────────────────────────────

interface ProductSpec {
  name: string
  price: number
  cost: number
  qty: number
  reorder_point: number
  sku?: string
  /** Defaults to true. Set false for products priced excluding VAT. */
  vat_inclusive?: boolean
  is_airtime?: boolean
  is_bundle?: boolean
  is_weighable?: boolean
  unit_label?: 'each' | 'kg' | 'g' | 'l' | 'ml'
  /** Days from now until expiry. Negative = already expired. */
  expires_in_days?: number
  /** Components, when this is a bundle. References ProductSpec.name in the
   *  same profile so we can wire the bundle_components table after insert. */
  bundle_of?: { component_name: string; qty: number }[]
}

interface DebtorSpec {
  name: string
  phone?: string
  address?: string
  total_owed: number
  description: string
  days_old?: number
}

interface SupplierSpec {
  name: string
  contact_name?: string
  phone?: string
}

interface RestockSpec {
  product_name: string
  supplier_name: string
  qty_added: number
  cost: number
  days_ago: number
  notes?: string
}

interface WastageSpec {
  product_name: string
  qty: number
  reason: 'expired' | 'damaged' | 'theft' | 'other'
  notes?: string
  days_ago: number
}

interface CustomerSpec {
  name: string
  contact_name?: string
  email?: string
  phone?: string
  vat_number?: string
  billing_address?: string
  payment_terms_days?: number
}

interface InvoiceSpec {
  customer_name: string
  status: 'draft' | 'sent' | 'paid'
  issued_days_ago: number
  due_in_days: number
  /** unit_price treated as VAT-inclusive when the store is VAT-registered. */
  lines: { description: string; qty: number; unit_price: number; vat_inclusive?: boolean }[]
  /** When `status === 'paid'`, the full balance is recorded as a payment.
   *  When set explicitly (and < total), the remainder is left outstanding. */
  paid_amount?: number
  payment_method?: 'eft' | 'cash' | 'card'
}

interface ExpenseSpec {
  category: string
  description: string
  amount: number
  days_ago: number
}

interface AirtimePinSpec {
  product_name: string
  pin: string
  serial: string
}

interface AlertSpec {
  type: 'out_of_stock' | 'low_stock' | 'ai_insight' | 'debtor' | 'weekly_report'
  message: string
  read?: boolean
  days_ago?: number
}

interface DemoProfile {
  store: {
    name: string
    phone: string
    location: string
    category: string
    vat_registered: boolean
    vat_number?: string
    business_address?: string
    /** Optional GPS — feeds F-P-06 (weather) + F-P-08 (competitor proximity).
     *  Migration 020 adds the lat/lng columns; older schemas ignore them. */
    lat?: number
    lng?: number
    /** Logged cash float — feeds F-P-07 working-capital-gap. */
    cash_balance?: number
  }
  /** Approx sales count per day; used to scale the 7-day chart. */
  sales_per_day: [min: number, max: number]
  /** Payment-method distribution for sales. Repeat entries to weight. */
  payment_methods: ReadonlyArray<'cash' | 'card' | 'snapscan' | 'yoco' | 'eft' | 'ewallet'>
  rng_seed: number
  products: ProductSpec[]
  suppliers: SupplierSpec[]
  restocks: RestockSpec[]
  wastage: WastageSpec[]
  debtors: DebtorSpec[]
  customers: CustomerSpec[]
  invoices: InvoiceSpec[]
  expenses: ExpenseSpec[]
  airtime_pins: AirtimePinSpec[]
  alerts: AlertSpec[]
  /** When true, also seed a stocktake snapshot for half the products. */
  seed_stocktake: boolean
}

const SPAZA_PROFILE: DemoProfile = {
  store: {
    name: 'Stoki Demo Spaza',
    phone: '+27821234567',
    location: 'Soweto',
    category: 'spaza',
    vat_registered: false,
    // Orlando West, Soweto — central enough to find Shoprite Usave / PnP nearby.
    lat: -26.2378,
    lng: 27.9087,
    cash_balance: 1800,
  },
  sales_per_day: [3, 5],
  payment_methods: ['cash', 'cash', 'cash', 'cash', 'card', 'snapscan', 'ewallet'],
  rng_seed: 0xC1F5,
  products: [
    { name: 'White Bread (700g)',     price: 16.99, cost: 12.00, qty: 24,  reorder_point: 10, expires_in_days: 3 },
    { name: 'Brown Bread (700g)',     price: 14.99, cost: 10.50, qty: 18,  reorder_point: 10 },
    { name: 'Milk (1L)',              price: 22.00, cost: 16.00, qty: 12,  reorder_point: 6,  expires_in_days: 5 },
    { name: 'Sugar (2.5kg)',          price: 55.00, cost: 42.00, qty: 8,   reorder_point: 4 },
    { name: 'Rice (2kg)',             price: 45.00, cost: 32.00, qty: 9,   reorder_point: 4 },
    { name: 'Cooking Oil (750ml)',    price: 45.00, cost: 33.00, qty: 11,  reorder_point: 5 },
    { name: 'Eggs (dozen)',           price: 50.00, cost: 38.00, qty: 7,   reorder_point: 4 },
    { name: 'Maggi 2-min Noodles',    price: 5.00,  cost: 3.00,  qty: 80,  reorder_point: 30 },
    { name: 'Simba Chips',            price: 10.00, cost: 6.50,  qty: 40,  reorder_point: 20 },
    { name: 'Coke 330ml Can',         price: 15.00, cost: 10.00, qty: 32,  reorder_point: 15 },
    { name: 'Sunlight Bar Soap',      price: 12.00, cost: 8.00,  qty: 25,  reorder_point: 10 },
    { name: 'OMO 500g',               price: 45.00, cost: 32.00, qty: 3,   reorder_point: 4 }, // intentionally low → low_stock alert
    { name: 'Loose Mealie Meal',      price: 22.00, cost: 14.00, qty: 25.5, reorder_point: 5, is_weighable: true, unit_label: 'kg', sku: 'MM-LOOSE' },
    { name: 'Vodacom Airtime R10',    price: 10.00, cost: 9.00,  qty: 0,   reorder_point: 5,  is_airtime: true,   sku: 'VOD-AIR-10' },
    { name: 'Tea & Toast Combo',      price: 35.00, cost: 26.00, qty: 0,   reorder_point: 0,  is_bundle: true,
      bundle_of: [
        { component_name: 'White Bread (700g)', qty: 1 },
        { component_name: 'Milk (1L)',          qty: 1 },
      ],
    },
  ],
  suppliers: [
    { name: 'Maponya Distributors',  contact_name: 'Sipho Khoza',  phone: '0114829210' },
    { name: 'Coca-Cola Bottling SA', contact_name: 'Faith Dlamini', phone: '0118981234' },
  ],
  restocks: [
    { product_name: 'White Bread (700g)', supplier_name: 'Maponya Distributors',  qty_added: 24, cost: 12.00, days_ago: 1, notes: 'Daily delivery' },
    { product_name: 'Milk (1L)',          supplier_name: 'Maponya Distributors',  qty_added: 12, cost: 16.00, days_ago: 1 },
    { product_name: 'Coke 330ml Can',     supplier_name: 'Coca-Cola Bottling SA', qty_added: 48, cost: 10.00, days_ago: 4, notes: '2 cases' },
    { product_name: 'OMO 500g',           supplier_name: 'Maponya Distributors',  qty_added: 6,  cost: 32.00, days_ago: 7 },
  ],
  wastage: [
    { product_name: 'White Bread (700g)', qty: 2, reason: 'expired', days_ago: 2, notes: 'End-of-day unsold loaves' },
    { product_name: 'Eggs (dozen)',       qty: 1, reason: 'damaged', days_ago: 5, notes: 'Dropped during stocking' },
  ],
  debtors: [
    { name: 'Mama Naledi',    phone: '0823334444', address: '12 Vilakazi St, Orlando West', total_owed: 250, description: 'Bread, milk, sugar' },
    { name: 'Joseph Mokoena', phone: '0827778888', address: '45 Khumalo Rd, Pimville',       total_owed: 120, description: 'Airtime + chips' },
    { name: 'Sis Tracy',      phone: '0825556666', address: 'Stand 1432, Diepkloof',         total_owed: 80,  description: 'Cooking oil + rice' },
    { name: 'Bra Cele',       phone: '0824443333',                                            total_owed: 350, description: 'Soap + Coke ×3', days_old: 21 },
    { name: 'Lerato Dlamini', phone: '0821112222', address: '8 Nelson Mandela Dr',           total_owed: 60,  description: 'Eggs + maggi' },
  ],
  customers: [
    { name: 'Orlando Tuck Shop', contact_name: 'Themba Mhlongo', phone: '0827654321', email: 'orlandotuck@outlook.co.za', billing_address: '7 Mhlongo St, Orlando East', payment_terms_days: 14 },
  ],
  invoices: [
    {
      customer_name: 'Orlando Tuck Shop',
      status: 'paid',
      issued_days_ago: 18,
      due_in_days: -4, // overdue when issued, but already paid
      lines: [
        { description: 'White Bread × 24',     qty: 24, unit_price: 14.00 },
        { description: 'Coke 330ml × 48',      qty: 48, unit_price: 12.00 },
        { description: 'Maggi Noodles × 100',  qty: 100, unit_price: 4.20 },
      ],
      payment_method: 'eft',
    },
    {
      customer_name: 'Orlando Tuck Shop',
      status: 'sent',
      issued_days_ago: 5,
      due_in_days: 9,
      lines: [
        { description: 'Sugar 2.5kg × 8',     qty: 8,  unit_price: 48.00 },
        { description: 'Cooking Oil × 6',     qty: 6,  unit_price: 38.00 },
      ],
    },
  ],
  expenses: [
    { category: 'rent',        description: 'Shop rent',                     amount: 1500, days_ago: 30 },
    { category: 'transport',   description: 'Stock pickup — Maponya Mall',   amount: 250,  days_ago: 4 },
    { category: 'electricity', description: 'Pre-paid electricity',          amount: 200,  days_ago: 12 },
    { category: 'wages',       description: 'Cousin part-time (Sat shift)',  amount: 350,  days_ago: 7 },
    { category: 'other',       description: 'Cleaning supplies',             amount: 85,   days_ago: 2 },
  ],
  airtime_pins: [
    { product_name: 'Vodacom Airtime R10', pin: '12345678901234', serial: 'V10-A-001' },
    { product_name: 'Vodacom Airtime R10', pin: '23456789012345', serial: 'V10-A-002' },
    { product_name: 'Vodacom Airtime R10', pin: '34567890123456', serial: 'V10-A-003' },
    { product_name: 'Vodacom Airtime R10', pin: '45678901234567', serial: 'V10-A-004' },
    { product_name: 'Vodacom Airtime R10', pin: '56789012345678', serial: 'V10-A-005' },
  ],
  alerts: [
    { type: 'low_stock',  message: 'OMO 500g is running low (3 left, reorder at 4)', days_ago: 1 },
    { type: 'ai_insight', message: 'Bread + Milk are commonly bought together — try a combo discount', days_ago: 3, read: true },
    { type: 'debtor',     message: 'Bra Cele has owed R350 for 21 days — send a reminder', days_ago: 1 },
  ],
  seed_stocktake: true,
}

const MARKET_PROFILE: DemoProfile = {
  store: {
    name: 'Stoki Demo Mini-Market',
    phone: '+27214561234',
    location: 'Cape Town',
    // Schema's stores_category_check only allows
    // 'spaza' | 'general_dealer' | 'food_stall' | 'other' — a mini-market
    // most closely fits general_dealer.
    category: 'general_dealer',
    vat_registered: true,
    vat_number: '4123456789',
    business_address: '15 Long Street, Cape Town, 8001',
    // Long Street, Cape Town CBD — dense formal-retail neighbourhood.
    lat: -33.9249,
    lng: 18.4241,
    cash_balance: 22500,
  },
  sales_per_day: [6, 9],
  payment_methods: ['card', 'card', 'snapscan', 'yoco', 'cash', 'cash', 'eft'],
  rng_seed: 0xA73E,
  products: [
    { name: 'Coca-Cola 2L',           price: 27.99, cost: 19.50, qty: 36, reorder_point: 12 },
    { name: 'Bokomo Cornflakes 500g', price: 39.99, cost: 28.00, qty: 22, reorder_point: 10 },
    { name: 'Spar Cheddar 250g',      price: 49.99, cost: 36.00, qty: 14, reorder_point: 6,  expires_in_days: 14 },
    { name: 'Long-Life Milk 1L',      price: 19.99, cost: 14.00, qty: 28, reorder_point: 12 },
    { name: 'Tastic Rice 2kg',        price: 49.99, cost: 36.00, qty: 16, reorder_point: 8 },
    { name: 'Beef Mince (per kg)',    price: 119.99, cost: 89.00, qty: 12.5, reorder_point: 4, is_weighable: true, unit_label: 'kg', sku: 'BEEF-MINCE' },
    { name: 'Apples (per kg)',        price: 24.99, cost: 16.50, qty: 18.0, reorder_point: 5,  is_weighable: true, unit_label: 'kg', sku: 'APPLE-RC' },
    { name: 'Bananas (per kg)',       price: 19.99, cost: 12.00, qty: 9.5,  reorder_point: 5,  is_weighable: true, unit_label: 'kg', sku: 'BANANA' },
    { name: 'Boerewors (per kg)',     price: 99.99, cost: 72.00, qty: 6.2,  reorder_point: 3,  is_weighable: true, unit_label: 'kg', sku: 'BWORS' },
    { name: 'Hamburger Rolls (×6)',   price: 29.99, cost: 21.00, qty: 18, reorder_point: 6 },
    { name: 'Lay\'s Salt & Vinegar',  price: 18.99, cost: 13.00, qty: 40, reorder_point: 15 },
    { name: 'Wilson\'s XXX Mints',    price: 12.00, cost: 8.00,  qty: 60, reorder_point: 25 },
    { name: 'Castle Lager 750ml',     price: 24.99, cost: 17.50, qty: 32, reorder_point: 12 },
    { name: 'Cape Wine Pinotage',     price: 89.00, cost: 62.00, qty: 11, reorder_point: 4 },
    { name: 'MTN Airtime R20',        price: 20.00, cost: 18.00, qty: 0,  reorder_point: 5, is_airtime: true, sku: 'MTN-20' },
    { name: 'Saturday Braai Pack',    price: 199.00, cost: 152.00, qty: 0, reorder_point: 0, is_bundle: true,
      bundle_of: [
        { component_name: 'Boerewors (per kg)',   qty: 1 },
        { component_name: 'Hamburger Rolls (×6)', qty: 1 },
        { component_name: 'Lay\'s Salt & Vinegar', qty: 2 },
        { component_name: 'Castle Lager 750ml',   qty: 6 },
      ],
    },
    { name: 'Imported Olive Oil 500ml', price: 159.00, cost: 110.00, qty: 2, reorder_point: 4 }, // low_stock
  ],
  suppliers: [
    { name: 'Pick n Pay Wholesale',    contact_name: 'Daphne Brown',     phone: '0214081111' },
    { name: 'Spar Distribution Cape',  contact_name: 'Hassan Adams',     phone: '0214952002' },
    { name: 'Boschendal Farm Direct',  contact_name: 'Pieter van Wyk',   phone: '0218702001' },
  ],
  restocks: [
    { product_name: 'Coca-Cola 2L',          supplier_name: 'Pick n Pay Wholesale',   qty_added: 24, cost: 19.50, days_ago: 2, notes: 'Weekend prep' },
    { product_name: 'Beef Mince (per kg)',   supplier_name: 'Boschendal Farm Direct', qty_added: 8,  cost: 89.00, days_ago: 1 },
    { product_name: 'Apples (per kg)',       supplier_name: 'Boschendal Farm Direct', qty_added: 12, cost: 16.50, days_ago: 1 },
    { product_name: 'Castle Lager 750ml',    supplier_name: 'Pick n Pay Wholesale',   qty_added: 24, cost: 17.50, days_ago: 3 },
    { product_name: 'Spar Cheddar 250g',     supplier_name: 'Spar Distribution Cape', qty_added: 10, cost: 36.00, days_ago: 4 },
  ],
  wastage: [
    { product_name: 'Bananas (per kg)',     qty: 1.5, reason: 'expired', days_ago: 1, notes: 'Over-ripe' },
    { product_name: 'Spar Cheddar 250g',    qty: 1,   reason: 'damaged', days_ago: 6, notes: 'Packaging punctured' },
  ],
  debtors: [
    { name: 'Aunty Kapana',  phone: '0729998877', address: '4 Bloubergrant Rd', total_owed: 180, description: 'Sunday roast supplies' },
    { name: 'Mr Fortuin',    phone: '0728886543', address: '22 Sea Point',      total_owed: 95,  description: 'Mince + bananas' },
  ],
  customers: [
    { name: 'Castle Catering',     contact_name: 'Linda Naidoo',      phone: '0218011234', email: 'orders@castlecatering.co.za', vat_number: '4012345678', billing_address: '8 Industrial Ave, Cape Town', payment_terms_days: 30 },
    { name: 'Atlantic Office Café', contact_name: 'Phumla Mbete',     phone: '0214451111', email: 'phumla@atlanticoffice.co.za', billing_address: '101 V&A Waterfront', payment_terms_days: 14 },
    { name: 'Powerhouse Gym',      contact_name: 'Brad Petersen',     phone: '0218224455', email: 'brad@powerhouse.fit',          billing_address: '50 Riebeeck St',         payment_terms_days: 30 },
  ],
  invoices: [
    {
      customer_name: 'Castle Catering',
      status: 'paid',
      issued_days_ago: 25,
      due_in_days: -5,
      lines: [
        { description: 'Beef Mince (per kg) × 12', qty: 12, unit_price: 119.99 },
        { description: 'Boerewors (per kg) × 6',   qty: 6,  unit_price: 99.99 },
        { description: 'Hamburger Rolls × 20',     qty: 20, unit_price: 29.99 },
      ],
      payment_method: 'eft',
    },
    {
      customer_name: 'Atlantic Office Café',
      status: 'paid',
      issued_days_ago: 12,
      due_in_days: 2,
      lines: [
        { description: 'Coca-Cola 2L × 12',        qty: 12, unit_price: 27.99 },
        { description: 'Lay\'s Salt & Vinegar × 24', qty: 24, unit_price: 18.99 },
        { description: 'Wilson\'s XXX Mints × 12', qty: 12, unit_price: 12.00 },
      ],
      payment_method: 'card',
    },
    {
      customer_name: 'Powerhouse Gym',
      status: 'sent',
      issued_days_ago: 6,
      due_in_days: 24,
      lines: [
        { description: 'Apples (per kg) × 8',     qty: 8,  unit_price: 24.99 },
        { description: 'Bananas (per kg) × 6',    qty: 6,  unit_price: 19.99 },
        { description: 'Long-Life Milk 1L × 24',  qty: 24, unit_price: 19.99 },
      ],
    },
    {
      // Overdue with partial payment.
      customer_name: 'Castle Catering',
      status: 'sent',
      issued_days_ago: 38,
      due_in_days: -8,
      lines: [
        { description: 'Boerewors (per kg) × 5', qty: 5, unit_price: 99.99 },
        { description: 'Castle Lager × 24',      qty: 24, unit_price: 24.99 },
      ],
      paid_amount: 500,
      payment_method: 'eft',
    },
  ],
  expenses: [
    { category: 'rent',        description: 'Shop rent — Long Street',         amount: 18500, days_ago: 30 },
    { category: 'electricity', description: 'City of Cape Town electricity',   amount: 1450,  days_ago: 12 },
    { category: 'wages',       description: 'Two cashiers — fortnightly',      amount: 8400,  days_ago: 7 },
    { category: 'transport',   description: 'Boschendal Farm pickup',          amount: 480,   days_ago: 1 },
    { category: 'other',       description: 'POS roll paper + bags',           amount: 320,   days_ago: 5 },
    { category: 'other',       description: 'Internet — fibre',                amount: 899,   days_ago: 14 },
  ],
  airtime_pins: [
    { product_name: 'MTN Airtime R20', pin: '11122233344455', serial: 'MTN-20-001' },
    { product_name: 'MTN Airtime R20', pin: '22233344455566', serial: 'MTN-20-002' },
    { product_name: 'MTN Airtime R20', pin: '33344455566677', serial: 'MTN-20-003' },
    { product_name: 'MTN Airtime R20', pin: '44455566677788', serial: 'MTN-20-004' },
    { product_name: 'MTN Airtime R20', pin: '55566677788899', serial: 'MTN-20-005' },
  ],
  alerts: [
    { type: 'low_stock',     message: 'Imported Olive Oil 500ml low (2 left, reorder at 4)', days_ago: 1 },
    { type: 'debtor',        message: 'Castle Catering invoice INV-00001 paid in full', days_ago: 5, read: true },
    { type: 'ai_insight',    message: 'Saturday boerewors sales spike — increase pre-Sat stock by 25%', days_ago: 2 },
    { type: 'weekly_report', message: 'Last week: R12,840 revenue, 156 sales, top seller — Castle Lager', days_ago: 0 },
  ],
  seed_stocktake: true,
}

const DEMO_PROFILES = [SPAZA_PROFILE, MARKET_PROFILE] as const

// ── Single-store seed implementation ───────────────────────────────────────

interface SeededProductRef {
  id: string
  name: string
  price: number
  cost: number
  is_weighable: boolean
  is_airtime: boolean
  is_bundle: boolean
}

const VAT_RATE = 0.15

async function seedOne(
  supabase: SupabaseClient,
  userId: string,
  profile: DemoProfile,
): Promise<string> {
  const now = new Date()

  // 1. Store header
  const { data: store, error: storeErr } = await supabase
    .from('stores')
    .insert({
      owner_id: userId,
      name: profile.store.name,
      phone: profile.store.phone,
      plan: 'free',
      timezone: 'Africa/Johannesburg',
      category: profile.store.category,
      location: profile.store.location,
      onboarding_completed: true,
      is_demo: true,
      vat_registered: profile.store.vat_registered,
      vat_number: profile.store.vat_number ?? null,
      business_address: profile.store.business_address ?? null,
      lat: profile.store.lat ?? null,
      lng: profile.store.lng ?? null,
      cash_balance: profile.store.cash_balance ?? null,
      cash_balance_updated_at: profile.store.cash_balance ? new Date().toISOString() : null,
    })
    .select()
    .single()
  if (storeErr || !store) throw new Error(storeErr?.message ?? `Failed to create demo store ${profile.store.name}`)
  const storeId: string = store.id

  // 2. Membership row (best-effort — older schemas may not have store_users)
  try {
    await supabase.from('store_users').insert({
      store_id: storeId, user_id: userId, role: 'owner', invited_by: userId,
    })
  } catch { /* non-fatal */ }

  // 3. Suppliers
  const { data: suppliers } = await supabase
    .from('suppliers')
    .insert(profile.suppliers.map(s => ({
      store_id: storeId,
      name: s.name,
      contact_name: s.contact_name ?? null,
      phone: s.phone ?? null,
    })))
    .select('id, name')
  const supplierByName = new Map<string, string>((suppliers ?? []).map(s => [s.name, s.id]))

  // 4. Products. Bundles need to insert first so component lookups can wire
  // them up afterwards — but we insert ALL products in one shot for speed,
  // then make a name→id map to wire bundle_components in step 5.
  const productInserts = profile.products.map(p => ({
    store_id: storeId,
    name: p.name,
    price: p.price,
    cost: p.cost,
    qty: p.qty,
    reorder_point: p.reorder_point,
    sku: p.sku ?? null,
    vat_inclusive: p.vat_inclusive ?? true,
    is_airtime: p.is_airtime ?? false,
    is_bundle: p.is_bundle ?? false,
    is_weighable: p.is_weighable ?? false,
    unit_label: p.unit_label ?? 'each',
    expiry_date: p.expires_in_days != null
      ? toDateOnly(addDays(now, p.expires_in_days))
      : null,
  }))
  const { data: products, error: prodErr } = await supabase
    .from('products')
    .insert(productInserts)
    .select('id, name, price, cost, is_weighable, is_airtime, is_bundle')
  if (prodErr || !products) throw new Error(prodErr?.message ?? 'Failed to seed products')
  const productByName = new Map<string, SeededProductRef>(
    (products as SeededProductRef[]).map(p => [p.name, p]),
  )

  // 5. Bundle components — wire each bundle product to its constituent
  // products. Skipped silently if migration 013 hasn't run.
  const bundleComponents: Array<Record<string, unknown>> = []
  for (const spec of profile.products) {
    if (!spec.is_bundle || !spec.bundle_of) continue
    const bundle = productByName.get(spec.name)
    if (!bundle) continue
    for (const comp of spec.bundle_of) {
      const component = productByName.get(comp.component_name)
      if (!component) continue
      bundleComponents.push({
        store_id: storeId,
        bundle_id: bundle.id,
        component_id: component.id,
        qty: comp.qty,
      })
    }
  }
  if (bundleComponents.length > 0) {
    try { await supabase.from('bundle_components').insert(bundleComponents) }
    catch { /* migration 013 optional */ }
  }

  // 6. Airtime PINs — unsold inventory ready to dispense.
  const airtimePinRows = profile.airtime_pins.flatMap(p => {
    const product = productByName.get(p.product_name)
    if (!product) return []
    return [{
      store_id: storeId,
      product_id: product.id,
      pin: p.pin,
      serial: p.serial,
    }]
  })
  if (airtimePinRows.length > 0) {
    try { await supabase.from('airtime_pins').insert(airtimePinRows) }
    catch { /* migration 012 optional */ }
  }

  // 7. Restocks — tied to suppliers via name lookup.
  const restockRows = profile.restocks.flatMap(r => {
    const product = productByName.get(r.product_name)
    if (!product) return []
    return [{
      store_id: storeId,
      product_id: product.id,
      qty_added: r.qty_added,
      cost: r.cost,
      supplier_id: supplierByName.get(r.supplier_name) ?? null,
      recorded_at: addDays(now, -r.days_ago).toISOString(),
      notes: r.notes ?? null,
    }]
  })
  if (restockRows.length > 0) await supabase.from('restocks').insert(restockRows)

  // 8. Wastage — scoped to migration 010, optional.
  const wastageRows = profile.wastage.flatMap(w => {
    const product = productByName.get(w.product_name)
    if (!product) return []
    return [{
      store_id: storeId,
      product_id: product.id,
      qty: w.qty,
      cost_at_loss: product.cost,
      reason: w.reason,
      notes: w.notes ?? null,
      recorded_at: addDays(now, -w.days_ago).toISOString(),
    }]
  })
  if (wastageRows.length > 0) {
    try { await supabase.from('wastage').insert(wastageRows) }
    catch { /* migration 010 optional */ }
  }

  // 9. Debtors — informal trade credit.
  const debtorInserts = profile.debtors.map(d => {
    const created = d.days_old != null ? addDays(now, -d.days_old).toISOString() : undefined
    return {
      store_id: storeId,
      name: d.name,
      phone: d.phone ?? null,
      address: d.address ?? null,
      total_owed: d.total_owed,
      ...(created ? { created_at: created } : {}),
    }
  })
  const { data: debtors } = await supabase
    .from('debtors')
    .insert(debtorInserts)
    .select('id, total_owed')

  // 10. Credit entries — paired ledger lines for each debtor.
  if (debtors) {
    try {
      await supabase.from('credit_entries').insert(
        debtors.map((d, i) => ({
          store_id: storeId,
          debtor_id: d.id,
          amount: d.total_owed,
          description: profile.debtors[i]?.description ?? null,
        })),
      )
    } catch { /* credit_entries.description is optional */ }
  }

  // 11. B2B customers.
  const customerInserts = profile.customers.map(c => ({
    store_id: storeId,
    name: c.name,
    contact_name: c.contact_name ?? null,
    email: c.email ?? null,
    phone: c.phone ?? null,
    vat_number: c.vat_number ?? null,
    billing_address: c.billing_address ?? null,
    payment_terms_days: c.payment_terms_days ?? 30,
  }))
  const { data: customers } = customerInserts.length > 0
    ? await supabase.from('customers').insert(customerInserts).select('id, name')
    : { data: null }
  const customerByName = new Map<string, string>((customers ?? []).map(c => [c.name, c.id]))

  // 12. Invoices — VAT computed from store registration. We compute totals
  // here rather than relying on a server action so we can wire historical
  // dates (needed for aged-receivables to look populated).
  let invoiceCounter = 1
  for (const inv of profile.invoices) {
    const customerId = customerByName.get(inv.customer_name)
    if (!customerId) continue
    const issuedAt = addDays(now, -inv.issued_days_ago)
    const dueAt = addDays(issuedAt, inv.due_in_days)
    const lineItems = inv.lines.map(l => {
      const vatInclusive = l.vat_inclusive ?? true
      const lineTotal = l.qty * l.unit_price
      const vatAmount = profile.store.vat_registered
        ? (vatInclusive ? lineTotal - lineTotal / (1 + VAT_RATE) : lineTotal * VAT_RATE)
        : 0
      return {
        description: l.description,
        qty: l.qty,
        unit_price: l.unit_price,
        vat_amount: round2(vatAmount),
        vat_inclusive: vatInclusive,
      }
    })
    const total = round2(lineItems.reduce((s, l) => s + l.qty * l.unit_price + (l.vat_inclusive ? 0 : l.vat_amount), 0))
    const vatAmount = round2(lineItems.reduce((s, l) => s + l.vat_amount, 0))
    const subtotalExcl = round2(total - (profile.store.vat_registered ? vatAmount : 0))
    const amountPaid =
      inv.status === 'paid' ? total
      : inv.paid_amount != null ? round2(inv.paid_amount)
      : 0

    const { data: invoiceRow } = await supabase
      .from('invoices')
      .insert({
        store_id: storeId,
        customer_id: customerId,
        invoice_number: invoiceCounter++,
        status: inv.status,
        issued_at: issuedAt.toISOString(),
        due_at: dueAt.toISOString(),
        line_items: lineItems,
        subtotal_excl: subtotalExcl,
        vat_amount: vatAmount,
        total,
        amount_paid: amountPaid,
      })
      .select('id')
      .single()

    if (invoiceRow && amountPaid > 0) {
      await supabase.from('invoice_payments').insert({
        invoice_id: invoiceRow.id,
        store_id: storeId,
        amount: amountPaid,
        paid_at: addDays(issuedAt, Math.max(1, Math.floor(inv.issued_days_ago / 2))).toISOString(),
        payment_method: inv.payment_method ?? 'eft',
        notes: null,
      })
    }
  }

  // 13. Sales over the last 7 days. Mix in occasional weighable-product
  // sales (decimal qty) and skip airtime/bundle products from the random
  // mix — those have their own demo flows. Sales of a bundle would need
  // recordBundleSale; we avoid that complexity in the seed.
  const sellable = (products as SeededProductRef[]).filter(p => !p.is_airtime && !p.is_bundle)
  const rng = mulberry32(profile.rng_seed)
  const sales: Array<Record<string, unknown>> = []
  for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
    const date = addDays(now, -dayOffset)
    const [min, max] = profile.sales_per_day
    const salesToday = min + Math.floor(rng() * (max - min + 1))
    for (let s = 0; s < salesToday; s++) {
      const product = sellable[Math.floor(rng() * sellable.length)]
      let qty: number
      if (product.is_weighable) {
        // Realistic weighable qty: 0.3kg–2.0kg, rounded to 0.1
        qty = Math.round((0.3 + rng() * 1.7) * 10) / 10
      } else {
        qty = 1 + Math.floor(rng() * 3) // 1..3
      }
      const recordedAt = new Date(date)
      recordedAt.setHours(8 + Math.floor(rng() * 11), Math.floor(rng() * 60), 0, 0)
      const lineTotal = product.price * qty
      const vatAmount = profile.store.vat_registered
        ? round2(lineTotal - lineTotal / (1 + VAT_RATE))
        : 0
      sales.push({
        store_id: storeId,
        product_id: product.id,
        qty,
        price_at_sale: product.price,
        cost_at_sale: product.cost,
        type: 'sale',
        channel: 'app',
        payment_method: profile.payment_methods[Math.floor(rng() * profile.payment_methods.length)],
        vat_amount: vatAmount,
        recorded_at: recordedAt.toISOString(),
      })
    }
  }
  // Single return entry so /sales history shows a refund row too.
  if (sellable.length > 0) {
    const refundProduct = sellable[Math.floor(rng() * sellable.length)]
    sales.push({
      store_id: storeId,
      product_id: refundProduct.id,
      qty: -1,
      price_at_sale: refundProduct.price,
      cost_at_sale: refundProduct.cost,
      type: 'return',
      channel: 'app',
      payment_method: 'cash',
      vat_amount: 0,
      recorded_at: addDays(now, -2).toISOString(),
    })
  }
  await supabase.from('sales').insert(sales)

  // 14. Expenses
  await supabase.from('expenses').insert(profile.expenses.map(e => ({
    store_id: storeId,
    category: e.category,
    description: e.description,
    amount: e.amount,
    recorded_at: addDays(now, -e.days_ago).toISOString(),
  })))

  // 15. Stocktake snapshot — covers half the products with mostly-matching
  // counts and a few small variances (so the variance report has something).
  if (profile.seed_stocktake) {
    try {
      const { data: stocktake } = await supabase
        .from('stocktakes')
        .insert({
          store_id: storeId,
          performed_by: userId,
          performed_at: addDays(now, -14).toISOString(),
          notes: 'Bi-weekly count',
        })
        .select('id')
        .single()

      if (stocktake) {
        const half = Math.ceil((products as SeededProductRef[]).length / 2)
        const stocktakeLines = (products as SeededProductRef[]).slice(0, half).map((p, i) => {
          // Match exactly for most; introduce ±1 variance on every 3rd row.
          const spec = profile.products.find(s => s.name === p.name)
          const systemQty = spec?.qty ?? 0
          const variance = i % 3 === 0 ? -1 : 0
          return {
            stocktake_id: stocktake.id,
            store_id: storeId,
            product_id: p.id,
            system_qty: systemQty,
            counted_qty: systemQty + variance,
            variance,
            cost_per_unit: p.cost,
          }
        })
        if (stocktakeLines.length > 0) {
          await supabase.from('stocktake_lines').insert(stocktakeLines)
        }
      }
    } catch { /* migration 011 optional */ }
  }

  // 16. Alerts
  if (profile.alerts.length > 0) {
    const alertRows = profile.alerts.map(a => ({
      store_id: storeId,
      type: a.type,
      message: a.message,
      read_at: a.read ? addDays(now, -(a.days_ago ?? 0)).toISOString() : null,
      created_at: addDays(now, -(a.days_ago ?? 0)).toISOString(),
    }))
    try { await supabase.from('alerts').insert(alertRows) }
    catch { /* alerts table always present, but harmless */ }
  }

  return storeId
}

// ── Helpers ────────────────────────────────────────────────────────────────

function addDays(d: Date, days: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + days)
  return out
}

function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
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
