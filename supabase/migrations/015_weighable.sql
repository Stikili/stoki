-- ============================================================
-- STOKI — Migration 015: Weighable goods
-- Spaza shops sell rice, sugar, mealie meal, sweets etc. by weight.
-- Switching qty from integer to numeric(10,3) lets us record fractional
-- quantities (1.250 kg, 0.5 L, 750 g). Postgres widens integer → numeric
-- automatically so existing rows are preserved exactly.
--
-- New product flags:
--   - is_weighable: cashier UI shows a weight input instead of qty stepper
--   - unit_label:   the display unit ('each' for piece goods, 'kg', 'g', 'l', 'ml')
-- Price stays per-unit. For weighable products, that means price-per-kg
-- (or whatever unit_label is set to). Line total = price × qty.
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_weighable boolean NOT NULL DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit_label text NOT NULL DEFAULT 'each'
  CHECK (unit_label IN ('each', 'kg', 'g', 'l', 'ml'));

-- Widen qty columns. Postgres preserves existing integer values exactly;
-- new rows can include up to 3 decimal places.
ALTER TABLE products        ALTER COLUMN qty           TYPE numeric(10,3);
ALTER TABLE products        ALTER COLUMN reorder_point TYPE numeric(10,3);
ALTER TABLE sales           ALTER COLUMN qty           TYPE numeric(10,3);
ALTER TABLE restocks        ALTER COLUMN qty_added     TYPE numeric(10,3);
ALTER TABLE wastage         ALTER COLUMN qty           TYPE numeric(10,3);
ALTER TABLE stocktake_lines ALTER COLUMN system_qty    TYPE numeric(10,3);
ALTER TABLE stocktake_lines ALTER COLUMN counted_qty   TYPE numeric(10,3);
ALTER TABLE stocktake_lines ALTER COLUMN variance      TYPE numeric(10,3);
