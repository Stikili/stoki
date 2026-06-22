-- STOKI — Migration 032: Move "has employees?" hint from user_metadata to stores
--
-- Onboarding originally answered the "do you have employees" question into
-- auth.users.user_metadata.has_employees_hint — wrong for owners with more
-- than one store, since the flag would apply to all of them uniformly. The
-- flag is per-store (the kiosk you run has staff; the warehouse you also
-- own doesn't).
--
-- This migration:
--   1. Adds stores.has_employees boolean column, default false.
--   2. No backfill from user_metadata — that's per-user JSONB and the
--      single-store case (which is most users today) is naturally false
--      until someone adds an Employee row. The dashboard tile-gating
--      logic ORs against (employee count > 0), so existing single-store
--      owners with employees already on payroll see the tile regardless.
--
-- App code paths affected:
--   - onboarding action writes here instead of user_metadata
--   - dashboard page reads here instead of user_metadata
--   - StoreRepository.update accepts hasEmployees in patch

BEGIN;

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS has_employees boolean NOT NULL DEFAULT false;

COMMIT;
