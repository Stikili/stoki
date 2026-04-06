import { Alert, AlertType } from '../entities/alert'

export interface IAlertRepository {
  findAll(storeId: string): Promise<Alert[]>
  findUnread(storeId: string): Promise<Alert[]>
  create(storeId: string, type: AlertType, message: string): Promise<Alert>
  markRead(storeId: string, alertId: string): Promise<void>
  markActionTaken(storeId: string, alertId: string): Promise<void>
}
