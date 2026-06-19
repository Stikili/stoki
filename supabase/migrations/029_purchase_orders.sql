-- STOKI — Migration 029: Purchase orders → goods receipt
--
-- Owner places a PO with a supplier. Each line tracks qty_ordered and
-- qty_received; the PO status is derived from coverage:
--   draft     — never sent
--   sent      — confirmed, nothing received yet
--   partial   — at least one line partially received
--   received  — every line received in full
--   cancelled — abandoned
--
-- Goods receipt is captured as qty_received increments on the PO line (no
-- separate GR table for v1; keeps the model simple and matches the spaza
-- reality where one wholesaler delivers one PO in one trip). Stock movement
-- stays with the existing restock flow — receiving a PO doesn't bump qty
-- automatically; the owner runs a restock from /inventory once delivered.
-- This separation keeps stock movements purely physical and audit-clean.

BEGIN;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id     uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  po_number       integer NOT NULL,
  expected_at     date,
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'sent', 'partial', 'received', 'cancelled')),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,
  UNIQUE (store_id, po_number)
);

CREATE INDEX IF NOT EXISTS purchase_orders_store_status_idx
  ON purchase_orders(store_id, status)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS purchase_orders_supplier_idx
  ON purchase_orders(supplier_id) WHERE deleted_at IS NULL;

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_purchase_orders" ON purchase_orders;
CREATE POLICY "members_purchase_orders" ON purchase_orders
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

CREATE TRIGGER purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id           uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  store_id        uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id      uuid REFERENCES products(id) ON DELETE SET NULL,
  -- Free-text description for off-catalogue items. Populated when product_id IS NULL.
  description     text NOT NULL,
  qty_ordered     numeric(10,3) NOT NULL CHECK (qty_ordered > 0),
  qty_received    numeric(10,3) NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
  unit_cost       numeric(10,2) NOT NULL CHECK (unit_cost >= 0),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS purchase_order_lines_po_idx
  ON purchase_order_lines(po_id);
CREATE INDEX IF NOT EXISTS purchase_order_lines_store_idx
  ON purchase_order_lines(store_id);

ALTER TABLE purchase_order_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_purchase_order_lines" ON purchase_order_lines;
CREATE POLICY "members_purchase_order_lines" ON purchase_order_lines
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

-- PO numbering — race-safe via UPDATE ... RETURNING on a per-store counter.
ALTER TABLE stores ADD COLUMN IF NOT EXISTS next_po_no integer NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION claim_next_po_no(p_store_id uuid)
RETURNS integer AS $$
DECLARE
  next_no integer;
BEGIN
  UPDATE stores
     SET next_po_no = next_po_no + 1
   WHERE id = p_store_id
   RETURNING next_po_no - 1 INTO next_no;
  RETURN next_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
