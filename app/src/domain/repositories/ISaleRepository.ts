import { Sale, NewSale, SalesSummary } from '../entities/sale'

export interface ISaleRepository {
  record(storeId: string, data: NewSale): Promise<Sale>
  findById(storeId: string, saleId: string): Promise<Sale | null>
  findByPeriod(storeId: string, from: Date, to: Date): Promise<Sale[]>
  summarise(storeId: string, from: Date, to: Date): Promise<SalesSummary>
  claimInvoiceNumber(storeId: string): Promise<number>
}
