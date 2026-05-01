-- ============================================================
-- STOKI — Migration 006: Trader operational features
-- Adds:
--   * payment_method on sales (cash, card, snapscan, yoco, eft, ewallet, credit)
--   * suppliers table + supplier_id FK on restocks
--   * cost_at_restock + recorded_at on restocks (the table existed; surface fields)
-- ============================================================

-- 1) Sales: payment method per sale
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'cash'
  CHECK (payment_method IN ('cash', 'card', 'snapscan', 'yoco', 'eft', 'ewallet', 'credit'));

CREATE INDEX IF NOT EXISTS sales_payment_method_idx ON sales(store_id, payment_method, recorded_at DESC);

-- 2) Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name         text NOT NULL,
  contact_name text,
  phone        text,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

CREATE INDEX IF NOT EXISTS suppliers_store_id_idx ON suppliers(store_id) WHERE deleted_at IS NULL;

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_suppliers" ON suppliers;
CREATE POLICY "owner_suppliers" ON suppliers
  FOR ALL USING (store_id = my_store_id());

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3) Restocks: connect to suppliers + ensure recorded_at + index
ALTER TABLE restocks ADD COLUMN IF NOT EXISTS recorded_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE restocks ADD COLUMN IF NOT EXISTS notes text;

-- supplier_id already exists on restocks (per schema.sql) but without an FK; add one
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restocks_supplier_id_fkey'
  ) THEN
    ALTER TABLE restocks
      ADD CONSTRAINT restocks_supplier_id_fkey
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS restocks_store_id_idx ON restocks(store_id, recorded_at DESC);

-- 4) Indexes on expenses for date-range queries
CREATE INDEX IF NOT EXISTS expenses_store_recorded_idx ON expenses(store_id, recorded_at DESC);
