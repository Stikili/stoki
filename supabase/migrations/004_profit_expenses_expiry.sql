-- Profit tracking: store cost at time of sale
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cost_at_sale numeric(10,2) DEFAULT 0;

-- Returns: sale type (sale or return)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'sale';

-- Expiry date tracking for perishables
ALTER TABLE products ADD COLUMN IF NOT EXISTS expiry_date date;

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category    text NOT NULL DEFAULT 'other',
  description text NOT NULL,
  amount      numeric(10,2) NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own expenses"
  ON expenses FOR ALL
  USING (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM stores WHERE owner_id = auth.uid()));
