-- ============================================================
-- STOKI — Migration 013: Combo bundles
-- A bundle is a "virtual" product that, when sold, decrements stock from a
-- set of component products instead of itself. Example: "School Lunch Combo"
-- (1 sandwich + 1 juice + 1 chips) — selling 1 combo decrements each of
-- those three from inventory. Cost-at-sale is the sum of component costs.
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_bundle boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS bundle_components (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  bundle_id     uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  -- ON DELETE RESTRICT on the component side so a component product can't
  -- be silently archived out from under a bundle definition.
  component_id  uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty           integer NOT NULL CHECK (qty > 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bundle_id, component_id)
);

CREATE INDEX IF NOT EXISTS bundle_components_bundle_idx ON bundle_components(bundle_id);
CREATE INDEX IF NOT EXISTS bundle_components_store_idx  ON bundle_components(store_id);

ALTER TABLE bundle_components ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_bundle_components" ON bundle_components;
CREATE POLICY "members_bundle_components" ON bundle_components
  FOR ALL USING (store_id IN (SELECT my_store_ids()));
