-- ============================================================
-- STOKI — Migration 011: Stocktake / variance auditing
-- A stocktake is a point-in-time count of physical stock vs system stock.
-- Variance = counted_qty - system_qty (negative = shrinkage, positive = found stock).
-- After submit, product.qty is set to counted_qty. The line table is the
-- audit trail and the source for variance reports.
-- ============================================================

CREATE TABLE IF NOT EXISTS stocktakes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  performed_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_at    timestamptz NOT NULL DEFAULT now(),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stocktakes_store_performed_idx
  ON stocktakes(store_id, performed_at DESC);

CREATE TABLE IF NOT EXISTS stocktake_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stocktake_id    uuid NOT NULL REFERENCES stocktakes(id) ON DELETE CASCADE,
  store_id        uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id      uuid REFERENCES products(id) ON DELETE SET NULL,
  system_qty      integer NOT NULL,
  counted_qty     integer NOT NULL CHECK (counted_qty >= 0),
  variance        integer NOT NULL,
  cost_per_unit   numeric(10,2) NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stocktake_lines_stocktake_idx
  ON stocktake_lines(stocktake_id);
CREATE INDEX IF NOT EXISTS stocktake_lines_product_idx
  ON stocktake_lines(product_id) WHERE product_id IS NOT NULL;

ALTER TABLE stocktakes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocktake_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_stocktakes" ON stocktakes;
CREATE POLICY "members_stocktakes" ON stocktakes
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

DROP POLICY IF EXISTS "members_stocktake_lines" ON stocktake_lines;
CREATE POLICY "members_stocktake_lines" ON stocktake_lines
  FOR ALL USING (store_id IN (SELECT my_store_ids()));
