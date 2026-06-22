-- STOKI — Rollback for migration 031 (index audit)
--
-- Drops the one index added by the audit. No data loss — dropping an
-- index never deletes rows, just slows queries that used it.

BEGIN;

DROP INDEX IF EXISTS fixed_assets_active_idx;

COMMIT;
