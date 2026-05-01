-- ============================================================
-- STOKI — Migration 007: VAT support + sequential tax invoices
-- Adds:
--   * stores.vat_registered, vat_number, vat_rate, business_address, next_invoice_no
--   * products.vat_inclusive (default true — SA standard for retail pricing)
--   * sales.vat_amount (the VAT portion captured at sale time, in rand)
--   * sales.invoice_number (per-store sequential, populated for VAT-registered stores)
--   * Atomic claim_next_invoice_no(store_id) function for race-free numbering
-- ============================================================

-- 1) Stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS vat_registered  boolean NOT NULL DEFAULT false;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS vat_number      text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS vat_rate        numeric(5,2) NOT NULL DEFAULT 15.00;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS business_address text;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS next_invoice_no integer NOT NULL DEFAULT 1;

-- 2) Products: VAT-inclusive flag (SA default = true; price as displayed already includes VAT)
ALTER TABLE products ADD COLUMN IF NOT EXISTS vat_inclusive boolean NOT NULL DEFAULT true;

-- 3) Sales: VAT amount captured at sale time + sequential invoice number
ALTER TABLE sales ADD COLUMN IF NOT EXISTS vat_amount     numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS invoice_number integer;

-- Multiple sale rows may share an invoice_number when they're line items
-- on the same tax invoice (e.g. cart with several products).
CREATE INDEX IF NOT EXISTS sales_store_invoice_no_idx
  ON sales(store_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

-- 4) Atomic invoice-number claim. Race-safe via row-level UPDATE-RETURNING.
-- Application calls this only for VAT-registered stores at sale-record time.
CREATE OR REPLACE FUNCTION claim_next_invoice_no(p_store_id uuid)
RETURNS integer AS $$
DECLARE
  next_no integer;
BEGIN
  UPDATE stores
     SET next_invoice_no = next_invoice_no + 1
   WHERE id = p_store_id
   RETURNING next_invoice_no - 1 INTO next_no;
  RETURN next_no;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
