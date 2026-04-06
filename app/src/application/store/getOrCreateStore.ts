import { Store } from '@/domain/entities/store'
import { IStoreRepository } from '@/domain/repositories/IStoreRepository'

export async function getOrCreateStore(
  repo: IStoreRepository,
  ownerId: string,
  defaultName: string
): Promise<Store> {
  const existing = await repo.getByOwnerId(ownerId)
  if (existing) return existing
  return repo.create(ownerId, defaultName)
}
