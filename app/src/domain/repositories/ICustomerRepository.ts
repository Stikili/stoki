import { Customer, NewCustomer } from '@/domain/entities/customer'

export interface ICustomerRepository {
  findAll(storeId: string): Promise<Customer[]>
  findArchived(storeId: string): Promise<Customer[]>
  findById(storeId: string, id: string): Promise<Customer | null>
  create(storeId: string, data: NewCustomer): Promise<Customer>
  update(storeId: string, id: string, data: Partial<NewCustomer>): Promise<Customer>
  archive(storeId: string, id: string): Promise<void>
  restore(storeId: string, id: string): Promise<void>
}
