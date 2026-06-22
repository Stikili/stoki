-- STOKI — Rollback for migration 032 (stores.has_employees)
--
-- Drops the column. Onboarding answers captured between migration 032
-- and rollback are lost; app code reverts to reading user_metadata.

BEGIN;

ALTER TABLE stores DROP COLUMN IF EXISTS has_employees;

COMMIT;
