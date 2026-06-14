-- STOKI — Migration 025: Supplier bills (aged payables)
--
-- Mirrors the customer-side invoices/invoice_payments pair from migration 009,
-- but for the payables side: bills owed TO suppliers. Aging is derived from
-- due_at minus now() in app code (see entities/supplier-bill.ts), so the
-- schema stays simple — just total, amount_paid, and dates.
--
-- Distinct from `restocks` (which capture stock-in events with cost) because
-- not every restock is on credit — most cash-and-carry runs aren't. A bill
-- represents an unpaid liability the owner needs to settle by a due date.

BEGIN;

-- 1) Supplier bills
CREATE TABLE IF NOT EXISTS supplier_bills (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  supplier_id   uuid NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  -- Supplier's own invoice/reference number — free text so we don't constrain
  -- formats across Bidvest, Massmart, neighbourhood wholesalers, etc.
  reference     text,
  issued_at     timestamptz NOT NULL DEFAULT now(),
  due_at        timestamptz NOT NULL,
  total         numeric(10,2) NOT NULL CHECK (total >= 0),
  amount_paid   numeric(10,2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

CREATE INDEX IF NOT EXISTS supplier_bills_store_open_idx
  ON supplier_bills(store_id, due_at)
  WHERE deleted_at IS NULL AND amount_paid < total;
CREATE INDEX IF NOT EXISTS supplier_bills_supplier_idx
  ON supplier_bills(supplier_id) WHERE deleted_at IS NULL;

ALTER TABLE supplier_bills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_supplier_bills" ON supplier_bills;
CREATE POLICY "members_supplier_bills" ON supplier_bills
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

CREATE TRIGGER supplier_bills_updated_at
  BEFORE UPDATE ON supplier_bills
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2) Supplier bill payments
CREATE TABLE IF NOT EXISTS supplier_bill_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id         uuid NOT NULL REFERENCES supplier_bills(id) ON DELETE CASCADE,
  store_id        uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  amount          numeric(10,2) NOT NULL CHECK (amount > 0),
  paid_at         timestamptz NOT NULL DEFAULT now(),
  payment_method  text NOT NULL DEFAULT 'eft',
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS supplier_bill_payments_bill_idx
  ON supplier_bill_payments(bill_id);
CREATE INDEX IF NOT EXISTS supplier_bill_payments_store_idx
  ON supplier_bill_payments(store_id, paid_at DESC);

ALTER TABLE supplier_bill_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_supplier_bill_payments" ON supplier_bill_payments;
CREATE POLICY "members_supplier_bill_payments" ON supplier_bill_payments
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

COMMIT;
