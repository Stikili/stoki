-- ============================================================
-- STOKI — Migration 018: Demo store flag
-- Every Stoki account gets a pre-populated "demo store" with showcase data
-- (products, sales, debtors, expenses) so first-time users can explore the
-- whole app surface before recording their own data. The flag below lets
-- the UI show a "DEMO" badge in the store-switcher and lets us avoid
-- accidentally invoicing demo data anywhere downstream.
-- ============================================================

ALTER TABLE stores ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS stores_owner_demo_idx
  ON stores(owner_id) WHERE is_demo = true;
