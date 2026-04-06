import { getServerData } from '@/lib/getServerData'
import AdvisorClient from './AdvisorClient'

export default async function AdvisorPage() {
  const { store } = await getServerData()
  return <AdvisorClient storeId={store.id} />
}
