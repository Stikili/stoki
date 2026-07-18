-- STOKI — Migration 039: per-store AI tone preference
--
-- Adds `ai_tone` to `stores`. Every AI-generated string (advisor answers,
-- WhatsApp brain replies, monthly report, anomaly alerts, explain-line-item)
-- reads this column and adapts the language accordingly.
--
-- Values: 'casual' | 'plain' | 'professional' | 'technical'
--   casual       — township/kasi vibe; slang; "howzit boss", "yebo", first-name
--   plain        — everyday SA English; no jargon; default for informal traders
--   professional — polite business tone; some retail terms; comfortable middle
--   technical    — full accounting language; GP margin, COGS, cash flow; formal
--
-- Default 'plain' matches the current baseline so nothing changes for existing
-- users until they opt in via /settings.

BEGIN;

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS ai_tone text NOT NULL DEFAULT 'plain';

ALTER TABLE stores
  DROP CONSTRAINT IF EXISTS stores_ai_tone_valid;

ALTER TABLE stores
  ADD CONSTRAINT stores_ai_tone_valid
  CHECK (ai_tone IN ('casual', 'plain', 'professional', 'technical'));

COMMIT;
