import { Invoice, NewInvoice, InvoiceStatus, InvoicePayment } from '@/domain/entities/invoice'

export interface IInvoiceRepository {
  findAll(storeId: string): Promise<Invoice[]>
  findOpen(storeId: string): Promise<Invoice[]>
  findById(storeId: string, id: string): Promise<Invoice | null>
  create(storeId: string, data: NewInvoice & { invoiceNumber: number; subtotalExcl: number; vatAmount: number; total: number }): Promise<Invoice>
  updateStatus(storeId: string, id: string, status: InvoiceStatus): Promise<void>
  archive(storeId: string, id: string): Promise<void>
  recordPayment(storeId: string, invoiceId: string, amount: number, paymentMethod: string, notes?: string): Promise<InvoicePayment>
  findPayments(storeId: string, invoiceId: string): Promise<InvoicePayment[]>
}
