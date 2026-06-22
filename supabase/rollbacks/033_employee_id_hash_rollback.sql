-- STOKI — Rollback for migration 033 (employee ID hashing)
--
-- Restores the plaintext id_number column. DATA LOSS WARNING: original
-- plaintext IDs are gone — we hashed and dropped them in migration 033.
-- Rollback gives you the column back but the values are NULL.
--
-- If you genuinely need the plaintext back, the only path is asking
-- every active employee for their ID again.

BEGIN;

ALTER TABLE employees ADD COLUMN IF NOT EXISTS id_number text;
ALTER TABLE employees DROP COLUMN IF EXISTS id_number_hash;
ALTER TABLE employees DROP COLUMN IF EXISTS id_number_last4;

COMMIT;
