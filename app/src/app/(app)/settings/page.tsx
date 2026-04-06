import { getServerData } from '@/lib/getServerData'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const { store, allStores } = await getServerData()
  return <SettingsClient store={store} canDelete={allStores.length > 1} />
}
