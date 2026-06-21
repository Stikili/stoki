/**
 * Cross-tenant RLS isolation test.
 *
 * Creates two test users + stores, seeds one row of every store-scoped
 * table for each, then queries each table from each user's *authenticated*
 * Supabase client and asserts they only see their own store's data.
 *
 * This is the test that would catch a wrong RLS policy before it leaks
 * one store's payroll to another.
 *
 * Requires three env vars (in app/.env.local or CI secrets):
 *   TEST_SUPABASE_URL              — project URL (use a NON-PROD project)
 *   TEST_SUPABASE_SERVICE_ROLE_KEY — admin key for seeding/cleanup
 *   TEST_SUPABASE_ANON_KEY         — public anon key for auth sign-in
 *
 * If any are missing the suite skips with a clear warning. Test data uses
 * a per-run timestamped prefix so concurrent runs don't collide; cleanup
 * runs in afterAll regardless of test outcome.
 *
 * Run locally: TEST_SUPABASE_URL=… npx vitest run rls-cross-tenant
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.TEST_SUPABASE_URL
const SERVICE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY
const ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY
const skipReason = (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY)
  ? 'Set TEST_SUPABASE_URL + TEST_SUPABASE_SERVICE_ROLE_KEY + TEST_SUPABASE_ANON_KEY to enable RLS isolation tests'
  : null

if (skipReason) {
  // eslint-disable-next-line no-console
  console.warn(`[rls-cross-tenant] skipping: ${skipReason}`)
}

const dscribe = skipReason ? describe.skip : describe

interface Tenant {
  userId: string
  storeId: string
  supplierId: string
  productId: string
  employeeId: string
  billId: string
  paymentId: string
  recurringId: string
  assetId: string
  depreciationId: string
  poId: string
  poLineId: string
  runId: string
  payslipLineId: string
  authed: SupabaseClient
}

dscribe('RLS cross-tenant isolation', () => {
  let admin: SupabaseClient
  const stamp = Date.now().toString(36)
  const passwd = 'rls-test-' + stamp
  let A: Tenant
  let B: Tenant

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SERVICE_KEY!, { auth: { persistSession: false } })

    // Set up two distinct tenants in parallel.
    A = await setupTenant('a', stamp, admin)
    B = await setupTenant('b', stamp, admin)
  }, 60_000)

  afterAll(async () => {
    // Delete the test stores (cascades to all store-scoped tables) then the
    // auth users. Either order works because every FK is ON DELETE CASCADE
    // either to the store or the user.
    for (const t of [A, B]) {
      if (!t) continue
      await admin.from('stores').delete().eq('id', t.storeId)
      await admin.auth.admin.deleteUser(t.userId)
    }
  }, 30_000)

  // For each table: A queries → sees only A's row; B queries → sees only B's.
  const tables: Array<{ name: string; aIdKey: keyof Tenant; bIdKey: keyof Tenant }> = [
    { name: 'supplier_bills',         aIdKey: 'billId',          bIdKey: 'billId' },
    { name: 'supplier_bill_payments', aIdKey: 'paymentId',       bIdKey: 'paymentId' },
    { name: 'recurring_expenses',     aIdKey: 'recurringId',     bIdKey: 'recurringId' },
    { name: 'fixed_assets',           aIdKey: 'assetId',         bIdKey: 'assetId' },
    { name: 'depreciation_entries',   aIdKey: 'depreciationId',  bIdKey: 'depreciationId' },
    { name: 'purchase_orders',        aIdKey: 'poId',            bIdKey: 'poId' },
    { name: 'purchase_order_lines',   aIdKey: 'poLineId',        bIdKey: 'poLineId' },
    { name: 'employees',              aIdKey: 'employeeId',      bIdKey: 'employeeId' },
    { name: 'payroll_runs',           aIdKey: 'runId',           bIdKey: 'runId' },
    { name: 'payslip_lines',          aIdKey: 'payslipLineId',   bIdKey: 'payslipLineId' },
  ]

  for (const t of tables) {
    it(`${t.name}: A cannot see B's row, B cannot see A's row`, async () => {
      const aSees = await A.authed.from(t.name).select('id, store_id')
      const bSees = await B.authed.from(t.name).select('id, store_id')

      expect(aSees.error, `A.${t.name} read error: ${aSees.error?.message}`).toBeNull()
      expect(bSees.error, `B.${t.name} read error: ${bSees.error?.message}`).toBeNull()

      // A's result must only contain A's storeId (and at least one row — we
      // seeded one). Same for B.
      expect(aSees.data?.length ?? 0).toBeGreaterThanOrEqual(1)
      expect(bSees.data?.length ?? 0).toBeGreaterThanOrEqual(1)
      expect(aSees.data?.every(r => r.store_id === A.storeId)).toBe(true)
      expect(bSees.data?.every(r => r.store_id === B.storeId)).toBe(true)

      // Cross-check: A's known row id must not appear in B's result and v.v.
      expect(aSees.data?.some(r => r.id === B[t.bIdKey])).toBe(false)
      expect(bSees.data?.some(r => r.id === A[t.aIdKey])).toBe(false)
    })
  }
})

/**
 * Create a fresh tenant: user + store + store_users link + one seed row of
 * every store-scoped table. Returns the tenant with ids for assertions.
 */
async function setupTenant(label: string, stamp: string, admin: SupabaseClient): Promise<Tenant> {
  const email = `rls-${label}-${stamp}@stoki.test`
  const password = 'rls-test-' + stamp

  // 1) Auth user
  const { data: userRes, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (userErr || !userRes.user) throw new Error(`createUser ${label}: ${userErr?.message}`)
  const userId = userRes.user.id

  // 2) Store
  const { data: store, error: storeErr } = await admin
    .from('stores')
    .insert({
      owner_id: userId,
      name: `rls-test-${label}-${stamp}`,
      plan: 'free',
      timezone: 'Africa/Johannesburg',
    })
    .select('id')
    .single()
  if (storeErr || !store) throw new Error(`createStore ${label}: ${storeErr?.message}`)
  const storeId = store.id as string

  // 3) Membership
  const { error: suErr } = await admin
    .from('store_users')
    .insert({ store_id: storeId, user_id: userId, role: 'owner' })
  if (suErr) throw new Error(`store_users ${label}: ${suErr.message}`)

  // 4) Seed one row in each store-scoped table the test asserts on.
  //    Use admin client so RLS is bypassed during seeding.
  const supplierRes = await admin.from('suppliers').insert({
    store_id: storeId, name: `supplier-${label}-${stamp}`,
  }).select('id').single()
  if (supplierRes.error) throw new Error(`supplier seed ${label}: ${supplierRes.error.message}`)
  const supplierId = supplierRes.data!.id as string

  const productRes = await admin.from('products').insert({
    store_id: storeId, name: `prod-${label}`, price: 10, cost: 5, qty: 1, reorder_point: 0,
  }).select('id').single()
  if (productRes.error) throw new Error(`product seed ${label}: ${productRes.error.message}`)
  const productId = productRes.data!.id as string

  const billRes = await admin.from('supplier_bills').insert({
    store_id: storeId, supplier_id: supplierId,
    issued_at: new Date().toISOString(),
    due_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    total: 100,
  }).select('id').single()
  if (billRes.error) throw new Error(`bill seed ${label}: ${billRes.error.message}`)
  const billId = billRes.data!.id as string

  const paymentRes = await admin.from('supplier_bill_payments').insert({
    bill_id: billId, store_id: storeId, amount: 25, payment_method: 'eft',
  }).select('id').single()
  if (paymentRes.error) throw new Error(`payment seed ${label}: ${paymentRes.error.message}`)
  const paymentId = paymentRes.data!.id as string

  const recurringRes = await admin.from('recurring_expenses').insert({
    store_id: storeId, category: 'rent', description: 'test rent',
    amount: 100, frequency: 'monthly', day_value: 1,
    next_due_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  }).select('id').single()
  if (recurringRes.error) throw new Error(`recurring seed ${label}: ${recurringRes.error.message}`)
  const recurringId = recurringRes.data!.id as string

  const assetRes = await admin.from('fixed_assets').insert({
    store_id: storeId, name: `asset-${label}`, category: 'fridge',
    cost: 12000, useful_life_months: 60, purchase_date: '2026-01-01',
  }).select('id').single()
  if (assetRes.error) throw new Error(`asset seed ${label}: ${assetRes.error.message}`)
  const assetId = assetRes.data!.id as string

  const depRes = await admin.from('depreciation_entries').insert({
    asset_id: assetId, store_id: storeId,
    period_of: '2026-01-31', amount: 200,
  }).select('id').single()
  if (depRes.error) throw new Error(`depreciation seed ${label}: ${depRes.error.message}`)
  const depreciationId = depRes.data!.id as string

  // PO: need a po_number — claim via the RPC.
  const poNoRes = await admin.rpc('claim_next_po_no', { p_store_id: storeId })
  if (poNoRes.error) throw new Error(`claim po_no ${label}: ${poNoRes.error.message}`)
  const poNumber = Number(poNoRes.data)

  const poRes = await admin.from('purchase_orders').insert({
    store_id: storeId, supplier_id: supplierId, po_number: poNumber, status: 'sent',
  }).select('id').single()
  if (poRes.error) throw new Error(`po seed ${label}: ${poRes.error.message}`)
  const poId = poRes.data!.id as string

  const poLineRes = await admin.from('purchase_order_lines').insert({
    po_id: poId, store_id: storeId, product_id: productId,
    description: 'test line', qty_ordered: 5, unit_cost: 10,
  }).select('id').single()
  if (poLineRes.error) throw new Error(`po line seed ${label}: ${poLineRes.error.message}`)
  const poLineId = poLineRes.data!.id as string

  const empRes = await admin.from('employees').insert({
    store_id: storeId, name: `emp-${label}`, base_salary: 5000, hire_date: '2026-01-01',
  }).select('id').single()
  if (empRes.error) throw new Error(`employee seed ${label}: ${empRes.error.message}`)
  const employeeId = empRes.data!.id as string

  const runRes = await admin.from('payroll_runs').insert({
    store_id: storeId, period_of: '2026-01-31',
    total_gross: 5000, total_paye: 0, total_uif_employee: 50, total_uif_employer: 50,
    total_sdl: 0, total_net: 4950,
  }).select('id').single()
  if (runRes.error) throw new Error(`payroll run seed ${label}: ${runRes.error.message}`)
  const runId = runRes.data!.id as string

  const slipRes = await admin.from('payslip_lines').insert({
    run_id: runId, store_id: storeId, employee_id: employeeId,
    gross: 5000, paye: 0, uif_employee: 50, uif_employer: 50, sdl: 0, net: 4950,
  }).select('id').single()
  if (slipRes.error) throw new Error(`payslip line seed ${label}: ${slipRes.error.message}`)
  const payslipLineId = slipRes.data!.id as string

  // 5) Sign in as this user → get authenticated client whose JWT contains
  //    auth.uid() = userId. RLS will use this to gate reads.
  const authed = createClient(SUPABASE_URL!, ANON_KEY!, { auth: { persistSession: false } })
  const signInRes = await authed.auth.signInWithPassword({ email, password })
  if (signInRes.error || !signInRes.data.session) {
    throw new Error(`signIn ${label}: ${signInRes.error?.message}`)
  }

  return {
    userId, storeId, supplierId, productId, employeeId,
    billId, paymentId, recurringId,
    assetId, depreciationId,
    poId, poLineId,
    runId, payslipLineId,
    authed,
  }
}
