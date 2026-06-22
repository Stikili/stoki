-- STOKI — Migration 033: Hash employees.id_number for POPIA defensibility
--
-- SA ID numbers are sensitive PII under POPIA — a breach with plaintext
-- IDs triggers regulatory disclosure obligations. The right design pattern
-- is: store a one-way hash for lookup/matching, plus the last 4 digits
-- for UI display ("•••• 5678"). The plaintext never lives in our DB.
--
-- Trade-off: we lose the ability to auto-fill SARS submissions with the
-- full ID. That's acceptable — the owner already keeps employee files
-- outside Stoki, and our EMP201 export is a working aid, not the
-- submission itself (see migration 030 header for that framing).
--
-- This migration:
--   1. Adds id_number_hash (sha256 hex) and id_number_last4 columns.
--   2. Backfills both from the existing plaintext id_number column where
--      present, using pgcrypto's digest() with a project salt. The salt
--      lives in the migration body so the backfill is reproducible;
--      app code reads the same value from env (PII_SALT) so hashes line
--      up. Salt is per-project, NOT per-employee — that's the trade-off
--      to allow lookup; per-employee salt would force a fresh table scan
--      to find "is this ID already enrolled".
--   3. Drops the plaintext id_number column.
--
-- IMPORTANT: set PII_SALT in the app env (Vercel project settings +
-- local .env.local) to the same value used here BEFORE running this
-- migration. Otherwise app-side hashing won't match what's in the DB
-- and ID lookups silently fail. Salt value below is the project
-- default; change it once and keep it stable.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS id_number_hash text,
  ADD COLUMN IF NOT EXISTS id_number_last4 text
    CHECK (id_number_last4 IS NULL OR id_number_last4 ~ '^[0-9]{4}$');

-- Backfill from existing plaintext rows. The salt below must match
-- process.env.PII_SALT in the app. Picked once at migration time and
-- never rotated (rotation would require re-prompting every employee
-- for their ID, which we can't do).
UPDATE employees
  SET id_number_hash  = encode(digest('stoki-pii-salt-v1' || id_number, 'sha256'), 'hex'),
      id_number_last4 = right(id_number, 4)
  WHERE id_number IS NOT NULL
    AND id_number_hash IS NULL;

ALTER TABLE employees DROP COLUMN IF EXISTS id_number;

COMMIT;
