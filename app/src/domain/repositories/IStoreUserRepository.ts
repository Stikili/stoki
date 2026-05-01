import { StoreUser, StoreRole } from '@/domain/entities/store-user'

export interface IStoreUserRepository {
  findByStore(storeId: string): Promise<StoreUser[]>
  findRoleForUser(storeId: string, userId: string): Promise<StoreRole | null>
  add(storeId: string, userId: string, role: StoreRole, invitedBy: string): Promise<StoreUser>
  updateRole(storeId: string, userId: string, role: StoreRole): Promise<void>
  remove(storeId: string, userId: string): Promise<void>
}
