-- ============================================================
-- STOKI — Migration 010: Wastage tracking
-- Records stock losses (expired, damaged, theft, other) separately from
-- sales/returns so margin reports stay clean and shrinkage is auditable.
-- ============================================================

CREATE TABLE IF NOT EXISTS wastage (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id    uuid REFERENCES products(id) ON DELETE SET NULL,
  qty           integer NOT NULL CHECK (qty > 0),
  cost_at_loss  numeric(10,2) NOT NULL DEFAULT 0,
  reason        text NOT NULL DEFAULT 'other'
                  CHECK (reason IN ('expired', 'damaged', 'theft', 'other')),
  notes         text,
  recorded_at   timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wastage_store_recorded_idx ON wastage(store_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS wastage_product_idx        ON wastage(product_id) WHERE product_id IS NOT NULL;

ALTER TABLE wastage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_wastage" ON wastage;
CREATE POLICY "members_wastage" ON wastage
  FOR ALL USING (store_id IN (SELECT my_store_ids()));
