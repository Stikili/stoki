-- ============================================================
-- STOKI — Migration 009: B2B customers + formal invoices
-- Adds:
--   * customers       — formal B2B accounts (VAT no, billing address, terms)
--   * invoices        — issued invoices with status, due date, line items (jsonb)
--   * invoice_payments — partial-or-full payments against an invoice
-- Distinct from the existing `debtors` table, which is informal trade credit
-- captured at the till. This layer is for proper B2B invoicing with aging.
-- ============================================================

-- 1) Customers (B2B)
CREATE TABLE IF NOT EXISTS customers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name                text NOT NULL,
  contact_name        text,
  email               text,
  phone               text,
  vat_number          text,
  billing_address     text,
  payment_terms_days  integer NOT NULL DEFAULT 30,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz
);

CREATE INDEX IF NOT EXISTS customers_store_idx ON customers(store_id) WHERE deleted_at IS NULL;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_customers" ON customers;
CREATE POLICY "members_customers" ON customers
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2) Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  customer_id     uuid REFERENCES customers(id) ON DELETE SET NULL,
  invoice_number  integer NOT NULL,
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  issued_at       timestamptz NOT NULL DEFAULT now(),
  due_at          timestamptz NOT NULL,
  -- line_items: jsonb array of { description, qty, unit_price, vat_amount, vat_inclusive, product_id? }
  line_items      jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal_excl   numeric(10,2) NOT NULL DEFAULT 0,
  vat_amount      numeric(10,2) NOT NULL DEFAULT 0,
  total           numeric(10,2) NOT NULL DEFAULT 0,
  amount_paid     numeric(10,2) NOT NULL DEFAULT 0,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS invoices_store_status_idx ON invoices(store_id, status, due_at);
CREATE INDEX IF NOT EXISTS invoices_customer_idx     ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS invoices_store_invno_idx  ON invoices(store_id, invoice_number);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_invoices" ON invoices;
CREATE POLICY "members_invoices" ON invoices
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 3) Invoice payments
CREATE TABLE IF NOT EXISTS invoice_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  store_id        uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  amount          numeric(10,2) NOT NULL,
  paid_at         timestamptz NOT NULL DEFAULT now(),
  payment_method  text NOT NULL DEFAULT 'eft',
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invoice_payments_invoice_idx ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS invoice_payments_store_idx   ON invoice_payments(store_id, paid_at DESC);

ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_invoice_payments" ON invoice_payments;
CREATE POLICY "members_invoice_payments" ON invoice_payments
  FOR ALL USING (store_id IN (SELECT my_store_ids()));
