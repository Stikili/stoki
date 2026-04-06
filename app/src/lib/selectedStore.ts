import { cookies } from 'next/headers'

const COOKIE = 'stoki_store'

export async function getSelectedStoreId(): Promise<string | null> {
  const jar = await cookies()
  return jar.get(COOKIE)?.value ?? null
}

export async function setSelectedStoreId(storeId: string): Promise<void> {
  const jar = await cookies()
  jar.set(COOKIE, storeId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
  })
}
