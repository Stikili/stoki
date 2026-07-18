import { getServerData } from '@/lib/getServerData'
import AdvisorClient from './AdvisorClient'

interface SearchParams { q?: string; send?: string }

export default async function AdvisorPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { store } = await getServerData()
  const { q, send } = await searchParams
  // send=1 auto-fires the pre-filled question on mount. Used by the
  // "Ask AI" buttons on ledger rows so tapping goes straight to an
  // answer instead of stopping at a pre-filled input.
  return <AdvisorClient storeId={store.id} prefill={q ?? ''} autoSend={send === '1'} />
}
