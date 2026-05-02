import { Supplier, NewSupplier } from '@/domain/entities/supplier'

export interface ISupplierRepository {
  findAll(storeId: string): Promise<Supplier[]>
  findArchived(storeId: string): Promise<Supplier[]>
  findById(storeId: string, supplierId: string): Promise<Supplier | null>
  create(storeId: string, data: NewSupplier): Promise<Supplier>
  update(storeId: string, supplierId: string, data: Partial<NewSupplier>): Promise<Supplier>
  archive(storeId: string, supplierId: string): Promise<void>
  restore(storeId: string, supplierId: string): Promise<void>
}
