/**
 * Small helpers shared by the advisor tools.
 *
 * Lifted out of lib/whatsapp-brain.ts when the tool layer was consolidated
 * so both the in-app advisor and the WhatsApp brain can use them. No
 * behaviour change — these are the exact functions whatsapp-brain.ts
 * relied on before the refactor.
 */

export type Period = 'today' | 'yesterday' | 'this_week' | 'this_month'

export function periodRange(p: Period): { from: Date; to: Date; label: string } {
  const now = new Date()
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
  switch (p) {
    case 'today':
      return { from: todayStart, to: todayEnd, label: 'today' }
    case 'yesterday': {
      const start = new Date(todayStart); start.setDate(start.getDate() - 1)
      const end = new Date(todayEnd); end.setDate(end.getDate() - 1)
      return { from: start, to: end, label: 'yesterday' }
    }
    case 'this_week': {
      const start = new Date(todayStart)
      const day = start.getDay() || 7
      start.setDate(start.getDate() - (day - 1))
      return { from: start, to: todayEnd, label: 'this week' }
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      return { from: start, to: todayEnd, label: 'this month' }
    }
  }
}
