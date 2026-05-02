import { WhatsAppBroadcast, NewWhatsAppBroadcast, BroadcastRecipient, BroadcastRecipientStatus } from '../entities/whatsapp-broadcast'

export interface IWhatsAppBroadcastRepository {
  /**
   * Create a broadcast header + queue all recipient rows in `pending` state.
   * The actual sending happens in a separate pass against Meta's API.
   */
  create(
    storeId: string,
    sentBy: string | null,
    data: NewWhatsAppBroadcast,
    recipients: { customerId: string | null; phone: string }[],
  ): Promise<WhatsAppBroadcast>

  findRecent(storeId: string, limit?: number): Promise<WhatsAppBroadcast[]>

  findById(storeId: string, id: string): Promise<WhatsAppBroadcast | null>

  findRecipients(storeId: string, broadcastId: string): Promise<BroadcastRecipient[]>

  findPendingRecipients(storeId: string, broadcastId: string): Promise<BroadcastRecipient[]>

  /** Mark a single recipient sent / failed and bump the parent counters atomically. */
  markRecipientStatus(
    storeId: string,
    recipientId: string,
    status: BroadcastRecipientStatus,
    error?: string,
  ): Promise<void>

  /** Stamp the broadcast as fully dispatched. Called once all recipients flushed. */
  markSent(storeId: string, broadcastId: string): Promise<void>
}
