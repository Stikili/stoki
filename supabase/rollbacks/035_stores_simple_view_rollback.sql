-- STOKI — Rollback for migration 035 (stores.simple_view)
--
-- Drops the column. Any per-store preference captured is lost; tiles
-- revert to the previous "show everything" behaviour.

BEGIN;

ALTER TABLE stores DROP COLUMN IF EXISTS simple_view;

COMMIT;
