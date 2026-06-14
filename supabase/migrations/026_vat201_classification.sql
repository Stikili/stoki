-- STOKI — Migration 026: VAT201 classification
--
-- Adds the codes a SARS VAT201 form needs to separate output and input VAT:
--   * products.vat_code   — standard / zero / exempt
--   * sales.vat_code      — snapshot at sale time, mirrors price_at_sale pattern
--   * expenses.is_capital — capital goods get reported in block 14 (not 15)
--
-- Everything defaults so existing data keeps current behaviour (all standard,
-- all operating). Owners reclassify products as they audit their catalogue.

BEGIN;

-- 1) Products: VAT classification.
-- 'standard' (15%), 'zero' (0% — brown bread, maize meal, milk, etc.),
-- 'exempt' (no VAT — rare for retail, included for completeness).
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS vat_code text NOT NULL DEFAULT 'standard';

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_vat_code_check;
ALTER TABLE products ADD CONSTRAINT products_vat_code_check
  CHECK (vat_code IN ('standard', 'zero', 'exempt'));

-- 2) Sales: snapshot of vat_code at sale time. NULL on legacy rows so we can
-- distinguish "unclassified history" from a deliberate 'standard' tag.
ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS vat_code text;

ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_vat_code_check;
ALTER TABLE sales ADD CONSTRAINT sales_vat_code_check
  CHECK (vat_code IS NULL OR vat_code IN ('standard', 'zero', 'exempt'));

-- 3) Expenses: capital flag. Capital-goods purchases (fridges, tills,
-- vehicles) sit in VAT201 block 14, separate from operating expenses (block 15).
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS is_capital boolean NOT NULL DEFAULT false;

COMMIT;
