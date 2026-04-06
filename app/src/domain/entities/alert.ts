export type AlertType =
  | 'out_of_stock'
  | 'low_stock'
  | 'ai_insight'
  | 'debtor'
  | 'weekly_report'

export interface Alert {
  id: string
  storeId: string
  type: AlertType
  message: string
  readAt: string | null
  actionTakenAt: string | null
  createdAt: string
}

export function isUnread(alert: Alert): boolean {
  return alert.readAt === null
}
