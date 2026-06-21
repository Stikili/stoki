-- Persist the outcome of each bank-statement line review so that
-- re-uploading the same statement doesn't re-show already-handled rows.
--
-- Key is (store_id, statement_date, amount, description_fingerprint).
-- description_fingerprint = first 200 chars of the description, lowercased
-- and whitespace-normalised — computed in the application layer.

CREATE TABLE bank_reconciliations (
  id                     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id               uuid REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  statement_date         date NOT NULL,
  amount                 numeric(12, 2) NOT NULL,
  description_fingerprint text NOT NULL,
  resolution             text NOT NULL CHECK (resolution IN ('matched', 'expensed', 'skipped')),
  resolved_at            timestamptz DEFAULT now() NOT NULL,
  UNIQUE (store_id, statement_date, amount, description_fingerprint)
);

ALTER TABLE bank_reconciliations ENABLE ROW LEVEL SECURITY;

-- Store members can read/write their own reconciliation records.
CREATE POLICY "bank_reconciliations_store_access"
  ON bank_reconciliations
  USING (
    store_id IN (
      SELECT store_id FROM store_users WHERE user_id = auth.uid()
    )
  );
