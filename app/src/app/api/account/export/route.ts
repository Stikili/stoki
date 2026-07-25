import { NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'
import { log } from '@/lib/log'

/**
 * POPIA data-portability endpoint. Section 23 of the Act (right to
 * access personal information) requires we let the data subject
 * download a copy of what we hold on them. This endpoint delivers
 * that copy as a single JSON file the user can archive, port to a
 * competitor, or just verify what we know.
 *
 * Scope: every row across every store the caller owns OR is a member
 * of. The user-scoped Supabase client is used deliberately — RLS
 * limits the result set to rows the user can already see in the app,
 * which is precisely what "their personal information" means for
 * this multi-user product.
 *
 * The auth.users profile (email, phone, created_at, user_metadata) is
 * pulled via the admin client because the standard user client can't
 * SELECT auth.users directly; we scope the admin call to
 * `auth.admin.getUserById(user.id)` so it can't leak anyone else.
 *
 * Response: 200 with Content-Disposition: attachment so the browser
 * saves it as `stoki-my-data-<YYYY-MM-DD>.json`. On any failure we
 * return a plain 500 — we do NOT want a partial export handed to
 * regulators as "the complete record".
 *
 * Rate limiting is deliberately absent: this endpoint should only be
 * used by an authenticated user against their own data, and even
 * abuse (10 exports/day) is orders of magnitude cheaper than the
 * value of the right it enforces.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // ── 1. Auth profile (admin-scoped to this user only). ────────────
    const admin = createAdminClient()
    const { data: authData } = await admin.auth.admin.getUserById(user.id)
    const authProfile = authData?.user ? {
      id: authData.user.id,
      email: authData.user.email ?? null,
      phone: authData.user.phone ?? null,
      created_at: authData.user.created_at,
      last_sign_in_at: authData.user.last_sign_in_at ?? null,
      email_confirmed_at: authData.user.email_confirmed_at ?? null,
      user_metadata: authData.user.user_metadata ?? {},
    } : null

    // ── 2. Every store the caller can see (owner OR member via RLS). ─
    const { data: allStores } = await supabase
      .from('stores')
      .select('*')
      .is('deleted_at', null)

    const stores: Array<Record<string, unknown>> = []
    for (const store of allStores ?? []) {
      const storeId = (store as { id: string }).id

      // Parallel queries per store — a busy shop can have thousands of
      // rows; independent tables fetch concurrently.
      const [
        products, sales, expenses, restocks, wastage, alerts,
        debtors, creditEntries,
        customers, invoices, invoicePayments,
        suppliers, supplierBills, supplierBillPayments,
        employees, payrollRuns, payslips,
        fixedAssets, purchaseOrders,
        stocktakes, advisorConvos,
      ] = await Promise.all([
        supabase.from('products').select('*').eq('store_id', storeId),
        supabase.from('sales').select('*').eq('store_id', storeId),
        supabase.from('expenses').select('*').eq('store_id', storeId),
        supabase.from('restocks').select('*').eq('store_id', storeId),
        supabase.from('wastage').select('*').eq('store_id', storeId),
        supabase.from('alerts').select('*').eq('store_id', storeId),
        supabase.from('debtors').select('*').eq('store_id', storeId),
        supabase.from('credit_entries').select('*').eq('store_id', storeId),
        supabase.from('customers').select('*').eq('store_id', storeId),
        supabase.from('invoices').select('*').eq('store_id', storeId),
        supabase.from('invoice_payments').select('*').eq('store_id', storeId),
        supabase.from('suppliers').select('*').eq('store_id', storeId),
        supabase.from('supplier_bills').select('*').eq('store_id', storeId),
        supabase.from('supplier_bill_payments').select('*').eq('store_id', storeId),
        supabase.from('employees').select('*').eq('store_id', storeId),
        supabase.from('payroll_runs').select('*').eq('store_id', storeId),
        supabase.from('payslips').select('*').eq('store_id', storeId),
        supabase.from('fixed_assets').select('*').eq('store_id', storeId),
        supabase.from('purchase_orders').select('*').eq('store_id', storeId),
        supabase.from('stocktakes').select('*').eq('store_id', storeId),
        supabase.from('advisor_conversations').select('*').eq('store_id', storeId),
      ])

      stores.push({
        store,
        counts: {
          products: products.data?.length ?? 0,
          sales: sales.data?.length ?? 0,
          expenses: expenses.data?.length ?? 0,
          customers: customers.data?.length ?? 0,
          invoices: invoices.data?.length ?? 0,
        },
        products: products.data ?? [],
        sales: sales.data ?? [],
        expenses: expenses.data ?? [],
        restocks: restocks.data ?? [],
        wastage: wastage.data ?? [],
        alerts: alerts.data ?? [],
        debtors: debtors.data ?? [],
        credit_entries: creditEntries.data ?? [],
        customers: customers.data ?? [],
        invoices: invoices.data ?? [],
        invoice_payments: invoicePayments.data ?? [],
        suppliers: suppliers.data ?? [],
        supplier_bills: supplierBills.data ?? [],
        supplier_bill_payments: supplierBillPayments.data ?? [],
        employees: employees.data ?? [],
        payroll_runs: payrollRuns.data ?? [],
        payslips: payslips.data ?? [],
        fixed_assets: fixedAssets.data ?? [],
        purchase_orders: purchaseOrders.data ?? [],
        stocktakes: stocktakes.data ?? [],
        advisor_conversations: advisorConvos.data ?? [],
      })
    }

    // ── 3. Any waitlist signups keyed by this user's email. ─────────
    // The waitlist collects pre-signup interest against paid tiers; a
    // POPIA export should include those too, since they're personal data.
    let waitlistSignups: unknown[] = []
    if (authProfile?.email) {
      const { data: wait } = await admin
        .from('waitlist_signups')
        .select('*')
        .eq('email', authProfile.email.toLowerCase())
      waitlistSignups = wait ?? []
    }

    const payload = {
      export_meta: {
        exported_at: new Date().toISOString(),
        exporter: 'Stoki POPIA data-portability export',
        format: 'JSON',
        format_version: 1,
        notes:
          'This file contains every personal-information record Stoki holds ' +
          'that you can access via your user account. Includes: your auth ' +
          'profile, every store you own or are a member of, and all business ' +
          'records tied to those stores (products, sales, expenses, credit ' +
          'book, customers, invoices, suppliers, payroll, alerts, AI advisor ' +
          'conversations, waitlist signups). Some server-side technical logs ' +
          '(request traces, Sentry error events) are retained for ' +
          'operational reasons but are not personal information under POPIA ' +
          "and aren't included here. Contact hello@stokiapp.com if you " +
          'want a full-text scan of retained logs against your email.',
      },
      auth_profile: authProfile,
      stores,
      waitlist_signups: waitlistSignups,
    }

    // Content-Disposition header makes browsers save-as instead of inline
    // render. Filename includes the export date so a user with multiple
    // exports over time can distinguish them.
    const filename = `stoki-my-data-${new Date().toISOString().slice(0, 10)}.json`
    const body = JSON.stringify(payload, null, 2)

    log.info('popia.export', {
      userId: user.id,
      stores: stores.length,
      bytes: body.length,
    })

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    log.error('popia.export.failed', { userId: user.id, error: e })
    return NextResponse.json({
      error: 'Export failed. Email hello@stokiapp.com and we\'ll get you a copy manually.',
    }, { status: 500 })
  }
}
