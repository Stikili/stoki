-- ============================================================
-- STOKI — Migration 014: WhatsApp customer broadcasts
-- Lets owners send a Meta-approved template message to many customers at
-- once. POPIA-compliant: only customers who have opted in receive broadcasts.
--
-- Meta's 24-hour rule: outside the conversation window we MUST use a
-- pre-approved template (not free-form text). This is enforced by the
-- send action itself; the schema just records intent + delivery state.
-- ============================================================

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS whatsapp_broadcasts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  template_name   text NOT NULL,
  language_code   text NOT NULL DEFAULT 'en',
  -- Body parameters interpolated into the template. Each entry is the value
  -- for {{1}}, {{2}}, ... in template body order. Stored as JSON array of strings.
  body_params     jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes           text,
  sent_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at         timestamptz,
  -- Aggregated counters updated as recipients flush through. Faster than
  -- COUNT(*) on whatsapp_broadcast_recipients for the history view.
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count      integer NOT NULL DEFAULT 0,
  failed_count    integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_broadcasts_store_idx
  ON whatsapp_broadcasts(store_id, created_at DESC);

CREATE TABLE IF NOT EXISTS whatsapp_broadcast_recipients (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid NOT NULL REFERENCES whatsapp_broadcasts(id) ON DELETE CASCADE,
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id  uuid REFERENCES customers(id) ON DELETE SET NULL,
  phone        text NOT NULL,
  status       text NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'sent', 'failed')),
  error        text,
  sent_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_broadcast_recipients_broadcast_idx
  ON whatsapp_broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS whatsapp_broadcast_recipients_store_status_idx
  ON whatsapp_broadcast_recipients(store_id, status);

ALTER TABLE whatsapp_broadcasts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_broadcast_recipients  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_whatsapp_broadcasts" ON whatsapp_broadcasts;
CREATE POLICY "members_whatsapp_broadcasts" ON whatsapp_broadcasts
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

DROP POLICY IF EXISTS "members_whatsapp_broadcast_recipients" ON whatsapp_broadcast_recipients;
CREATE POLICY "members_whatsapp_broadcast_recipients" ON whatsapp_broadcast_recipients
  FOR ALL USING (store_id IN (SELECT my_store_ids()));
