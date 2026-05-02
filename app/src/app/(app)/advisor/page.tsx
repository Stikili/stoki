import { getServerData } from '@/lib/getServerData'
import AdvisorClient from './AdvisorClient'

interface SearchParams { q?: string }

export default async function AdvisorPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { store } = await getServerData()
  const { q } = await searchParams
  return <AdvisorClient storeId={store.id} prefill={q ?? ''} />
}
