import { Sale, NewSale, SalesSummary } from '../entities/sale'

export interface ISaleRepository {
  record(storeId: string, data: NewSale): Promise<Sale>
  findByPeriod(storeId: string, from: Date, to: Date): Promise<Sale[]>
  summarise(storeId: string, from: Date, to: Date): Promise<SalesSummary>
  claimInvoiceNumber(storeId: string): Promise<number>
}
