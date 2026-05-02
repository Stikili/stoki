-- ============================================================
-- STOKI — Migration 012: Airtime PIN selling
-- Spaza shops sell pre-loaded airtime vouchers (Vodacom / MTN / Cell C / Telkom).
-- Owner buys a batch, uploads the PINs to Stoki. Each sale of an airtime
-- product pops the oldest unsold PIN, marks it sold, and the cashier reads
-- it to the customer once. PINs are one-time-use — never re-dispensed.
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS is_airtime boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS airtime_pins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id      uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  pin             text NOT NULL,
  serial          text,
  expires_at      timestamptz,
  sold_at         timestamptz,
  sold_in_sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Hot path: "give me the next unsold PIN for this product". Partial index
-- skips sold rows entirely so dispensing stays fast as inventory grows.
CREATE INDEX IF NOT EXISTS airtime_pins_available_idx
  ON airtime_pins(store_id, product_id, created_at)
  WHERE sold_at IS NULL;

CREATE INDEX IF NOT EXISTS airtime_pins_sold_idx
  ON airtime_pins(store_id, sold_at DESC)
  WHERE sold_at IS NOT NULL;

ALTER TABLE airtime_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_airtime_pins" ON airtime_pins;
CREATE POLICY "members_airtime_pins" ON airtime_pins
  FOR ALL USING (store_id IN (SELECT my_store_ids()));
