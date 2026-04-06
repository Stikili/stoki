import { NextResponse } from 'next/server'
import { createClient } from '@/infrastructure/supabase/server'
import { StoreRepository } from '@/infrastructure/supabase/repositories/StoreRepository'
import { ProductRepository } from '@/infrastructure/supabase/repositories/ProductRepository'
import { SaleRepository } from '@/infrastructure/supabase/repositories/SaleRepository'
import { DebtorRepository } from '@/infrastructure/supabase/repositories/DebtorRepository'
import { CreditEntryRepository } from '@/infrastructure/supabase/repositories/CreditEntryRepository'
import { ExpenseRepository } from '@/infrastructure/supabase/repositories/ExpenseRepository'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const storeRepo = new StoreRepository(supabase)
  const allStores = await storeRepo.findAllByOwner(user.id)
  if (allStores.length === 0) return NextResponse.json({ error: 'No stores' }, { status: 404 })

  const store = allStores[0]
  const productRepo = new ProductRepository(supabase)
  const saleRepo = new SaleRepository(supabase)
  const debtorRepo = new DebtorRepository(supabase)
  const creditRepo = new CreditEntryRepository(supabase)
  const expenseRepo = new ExpenseRepository(supabase)

  // Get all data (no date limit for full export)
  const allTime = new Date(2020, 0, 1)
  const future = new Date(2030, 0, 1)

  const [products, sales, debtors, expenses] = await Promise.all([
    productRepo.findAll(store.id),
    saleRepo.findByPeriod(store.id, allTime, future),
    debtorRepo.findAll(store.id),
    expenseRepo.findByPeriod(store.id, allTime, future),
  ])

  // Get credit entries for each debtor
  const debtorsWithEntries = await Promise.all(
    debtors.map(async (d) => ({
      ...d,
      entries: await creditRepo.findByDebtor(store.id, d.id),
    }))
  )

  const backup = {
    exportedAt: new Date().toISOString(),
    store: { name: store.name, phone: store.phone, category: store.category, location: store.location },
    products,
    sales,
    debtors: debtorsWithEntries,
    expenses,
    meta: {
      productCount: products.length,
      salesCount: sales.length,
      debtorCount: debtors.length,
      expenseCount: expenses.length,
    },
  }

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="stoki-backup-${store.name.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.json"`,
    },
  })
}
