-- STOKI — Migration 041: invested capital + ROIC tracking on stores
--
-- Adds two nullable columns to `stores`:
--   invested_capital            numeric(14,2)  — the rand amount the
--                               owner put in to start / grow this business.
--                               NULL = "not tracked yet" (owner chose to skip
--                               on onboarding, or hasn't opened settings).
--   invested_capital_updated_at timestamptz    — stamps the last time the
--                               owner set the number; feeds a "last updated
--                               3 months ago" hint in the settings UI so
--                               they know when to refresh it.
--
-- Enables:
--   - ROIC calculation in the AI advisor + monthly report:
--     roic = (trailing-12-month net profit / invested_capital) × 100
--   - Payback-period estimate in months
--   - Opportunity-cost comparison vs SARB repo + typical SA fixed deposit
--
-- Design: BOTH columns nullable so existing stores don't break. Owner
-- opts in — the ROIC feature silently skips stores with NULL. No back-
-- fill; the number is genuine only if the owner types it in.

BEGIN;

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS invested_capital            numeric(14, 2),
  ADD COLUMN IF NOT EXISTS invested_capital_updated_at timestamptz;

-- Zero is a legitimate value ("I inherited the business, put in nothing")
-- so we allow it. Negative capital is nonsensical though — guard against
-- negative-return-on-negative-investment nonsense.
ALTER TABLE stores
  DROP CONSTRAINT IF EXISTS stores_invested_capital_non_negative;
ALTER TABLE stores
  ADD CONSTRAINT stores_invested_capital_non_negative
  CHECK (invested_capital IS NULL OR invested_capital >= 0);

COMMIT;
