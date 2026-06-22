-- STOKI — Migration 031: Index audit on the accounting + ERP tables
--
-- Audit walked every table from migrations 025-030 against the query
-- patterns in the new repositories. Findings summary:
--
--   GOOD AS SHIPPED (no changes needed):
--     supplier_bills           — partial idx on (store_id, due_at) where open
--     supplier_bill_payments   — bill_idx + store_idx
--     recurring_expenses       — due_idx (partial on active, ordered by next_due_at)
--     depreciation_entries     — store_period_idx + UNIQUE(asset_id, period_of)
--                                (the UNIQUE serves prefix queries on asset_id)
--     purchase_orders          — store_status_idx + supplier_idx + UNIQUE(store_id, po_number)
--     purchase_order_lines     — po_idx + store_idx
--     employees                — store_active_idx (partial on deleted_at)
--     payroll_runs             — store_period_idx + UNIQUE(store_id, period_of)
--     payslip_lines            — run_idx + store_idx + UNIQUE(run_id, employee_id)
--
--   ADDED HERE (1 micro-optimization):
--     fixed_assets             — partial idx on the active-only subset, since
--                                FixedAssetRepository.findActive runs on every
--                                monthly-depreciation cron tick across all stores.
--
--   NOT YET ADDRESSED (scale-time, not v1):
--     supplier_bills.findOpen  — pulls all rows then filters `amount_paid < total`
--                                in JS because PostgREST can't express that filter
--                                directly. Fine while N stays in the hundreds per
--                                store; revisit with a generated `is_open` column
--                                or a SQL view once a store has > 5_000 bills.
--
-- Run roll-back: supabase/rollbacks/031_index_audit_rollback.sql

BEGIN;

-- Hot-path: the monthly cron scans every store's active fixed assets to post
-- depreciation entries. The pre-existing `fixed_assets_store_idx` covers
-- (store_id) WHERE deleted_at IS NULL — fine for the dashboard's findAll, but
-- the cron's findActive call has to filter on status='active' after the scan.
-- This partial index narrows it directly to the active subset.
CREATE INDEX IF NOT EXISTS fixed_assets_active_idx
  ON fixed_assets(store_id)
  WHERE deleted_at IS NULL AND status = 'active';

COMMIT;
