-- STOKI — Migration 028: Fixed asset register + depreciation
--
-- SARS requires SBC owners to maintain a fixed-asset register and depreciate
-- per Binding General Ruling 7. Most SMME owners ignore this and overstate
-- profit. We model assets and post monthly depreciation entries so P&L is
-- honest. Depreciation is NOT an expense row (no cash outflow) — it lives
-- in its own table and the P&L / provisional-tax math subtracts it.
--
-- v1 only supports straight-line depreciation (cost − residual) / months.
-- Diminishing-balance, Section 12C and special wear-and-tear can come later.

BEGIN;

CREATE TABLE IF NOT EXISTS fixed_assets (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  category              text NOT NULL DEFAULT 'other',
  -- Purchase cost (excl VAT). Residual = expected resale value at end of life.
  cost                  numeric(12,2) NOT NULL CHECK (cost > 0),
  residual_value        numeric(12,2) NOT NULL DEFAULT 0 CHECK (residual_value >= 0),
  -- Useful life in whole months. SARS BGR7 typical: vehicles 60, equipment 60,
  -- furniture 72, computers 36, fridges 60. Owner chooses per asset.
  useful_life_months    integer NOT NULL CHECK (useful_life_months > 0),
  purchase_date         date NOT NULL,
  -- 'active' depreciates monthly. 'disposed' = sold/scrapped. 'fully_depreciated'
  -- = accumulated >= depreciable base.
  status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'disposed', 'fully_depreciated')),
  disposed_at           date,
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);

CREATE INDEX IF NOT EXISTS fixed_assets_store_idx
  ON fixed_assets(store_id) WHERE deleted_at IS NULL;

ALTER TABLE fixed_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_fixed_assets" ON fixed_assets;
CREATE POLICY "members_fixed_assets" ON fixed_assets
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

CREATE TRIGGER fixed_assets_updated_at
  BEFORE UPDATE ON fixed_assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- One row per (asset, month) — periodOf is the last day of the month.
-- Uniqueness on (asset_id, period_of) prevents double-posting if cron fires twice.
CREATE TABLE IF NOT EXISTS depreciation_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id        uuid NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
  store_id        uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  period_of       date NOT NULL,
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (asset_id, period_of)
);

CREATE INDEX IF NOT EXISTS depreciation_entries_store_period_idx
  ON depreciation_entries(store_id, period_of);

ALTER TABLE depreciation_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_depreciation_entries" ON depreciation_entries;
CREATE POLICY "members_depreciation_entries" ON depreciation_entries
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

COMMIT;
