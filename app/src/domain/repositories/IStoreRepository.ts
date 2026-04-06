import { Store, StoreCategory } from '../entities/store'

export interface IStoreRepository {
  getByOwnerId(ownerId: string): Promise<Store | null>
  findAllByOwner(ownerId: string): Promise<Store[]>
  create(ownerId: string, name: string, phone?: string): Promise<Store>
  update(storeId: string, patch: {
    name?: string
    phone?: string
    category?: StoreCategory
    location?: string
    onboardingCompleted?: boolean
  }): Promise<Store>
  delete(storeId: string): Promise<void>
}
