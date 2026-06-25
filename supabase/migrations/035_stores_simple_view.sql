-- STOKI — Migration 035: stores.simple_view
--
-- Per-store information-density preference. When true (default), the
-- dashboard's Manage tile grid shows the "Daily" section in full but
-- collapses the "Books" section behind a click-to-expand. The spaza
-- audience opens the dashboard 20× a day; collapsing the accounting
-- tiles they don't touch removes a wall of icons that doesn't apply.
--
-- This is NOT a per-store-type fork. Same code, same data model, same
-- product. Owners with formal-accounting workloads flip the toggle off
-- from Settings and see everything by default.
--
-- Default true is biased toward simplicity — matches landing positioning
-- ("Built for South African shops & SMMEs") and the principle of "show
-- less to discover the value, expand for more when ready". SMME-type
-- users who need the full grid find the toggle within minutes when they
-- go looking for the modules they expected.

BEGIN;

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS simple_view boolean NOT NULL DEFAULT true;

COMMIT;
