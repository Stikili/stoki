import { NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { createAdminClient } from '@/infrastructure/supabase/admin'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Delete all user data in order (respecting foreign keys)
  const { data: stores } = await admin.from('stores').select('id').eq('owner_id', user.id)
  const storeIds = (stores ?? []).map((s: { id: string }) => s.id)

  if (storeIds.length > 0) {
    // Delete store-scoped data
    for (const storeId of storeIds) {
      await admin.from('push_subscriptions').delete().eq('store_id', storeId)
      await admin.from('expenses').delete().eq('store_id', storeId)
      await admin.from('sales').delete().eq('store_id', storeId)
      await admin.from('credit_entries').delete().eq('store_id', storeId)
      await admin.from('debtors').delete().eq('store_id', storeId)
      await admin.from('alerts').delete().eq('store_id', storeId)
      await admin.from('products').delete().eq('store_id', storeId)
    }
    // Delete stores
    await admin.from('stores').delete().eq('owner_id', user.id)
  }

  // Delete the auth user via admin API
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
