-- STOKI — Rollback for migration 034 (rate-limits + atomic advisor counter)
--
-- Drops the rate-limit table + the atomic counter RPC.
-- DATA LOSS: in-flight rate-limit counters disappear (acceptable — fresh
-- start). Existing ai_advisor_usage rows are unaffected; the RPC is just
-- a faster path to the same data.

BEGIN;

DROP FUNCTION IF EXISTS increment_advisor_usage(uuid, date);
DROP TABLE IF EXISTS request_rate_limits;

COMMIT;
