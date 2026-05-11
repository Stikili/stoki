-- STOKI — Migration 023: Per-(user, store, channel) advisor conversation memory
--
-- Adds short-term conversation memory so the bot can stitch context across
-- turns ("yesterday you asked about bread margin — did you ever raise the
-- price?"). Stored per channel (in-app vs WhatsApp) so a WhatsApp question
-- doesn't leak into the in-app advisor and vice versa — different surfaces
-- have different vocabularies.
--
-- Retention: 30 days. Older rows get pruned by the daily cron sweep; no
-- need to hand-trim. Compute cost stays bounded because we only ever load
-- the most recent N exchanges per (user, store, channel) on read.

BEGIN;

CREATE TABLE IF NOT EXISTS advisor_conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id    uuid NOT NULL REFERENCES stores(id)    ON DELETE CASCADE,
  /** 'in_app' for the dashboard advisor; 'whatsapp' for the WhatsApp bot. */
  channel     text NOT NULL CHECK (channel IN ('in_app', 'whatsapp')),
  role        text NOT NULL CHECK (role IN ('user', 'assistant')),
  /** The message body. Long-ish messages are fine — we cap turn count, not bytes. */
  content     text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Read path is always "give me the last N rows for this (user, store, channel)".
-- DESC index on (user_id, store_id, channel, created_at) makes that a single
-- scan from the leaf with no sort.
CREATE INDEX IF NOT EXISTS advisor_conv_lookup_idx
  ON advisor_conversations(user_id, store_id, channel, created_at DESC);

ALTER TABLE advisor_conversations ENABLE ROW LEVEL SECURITY;

-- Users can read their own conversation rows on stores they're a member of.
DROP POLICY IF EXISTS "self_advisor_conv_read" ON advisor_conversations;
CREATE POLICY "self_advisor_conv_read" ON advisor_conversations
  FOR SELECT USING (user_id = auth.uid() AND store_id IN (SELECT my_store_ids()));

-- Inserts happen from the advisor route via admin client (analytics-style),
-- so no RLS for INSERT here. The admin client bypasses RLS entirely; we
-- still scope the row to user_id explicitly so the rows belong to the
-- caller, not the platform.

COMMIT;
