-- ============================================================
-- STOKI — Migration 005: WhatsApp number on stores
-- Links a store to its owner's WhatsApp number for the bot.
-- ============================================================

ALTER TABLE stores ADD COLUMN IF NOT EXISTS whatsapp_number text;

CREATE INDEX IF NOT EXISTS stores_whatsapp_number_idx
  ON stores(whatsapp_number) WHERE whatsapp_number IS NOT NULL;
