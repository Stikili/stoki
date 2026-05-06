-- STOKI — Migration 020: AI Economic Intelligence support
--
-- Adds the schema needed by the new auto-pushed and AI-advisor features.
-- Backwards-compatible: every addition is `IF NOT EXISTS` and `nullable`,
-- so the app keeps working without these tables / columns until applied.
--
-- Touches:
--   * stores            +lat, +lng              (F-P-06 weather, F-P-08 competitor)
--   * stores            +cash_balance           (F-P-07 working capital gap)
--   * restocks          +ordered_at, +ordered_qty, +supplier_invoice_change_pct
--                                               (F-A-04 supplier scorecard)
--   * price_changes     new table               (F-P-02 price sweet spot)
--   * ai_advisor_usage  new table               (cost-meter)
--   * sale_events       new table               (F-A-03 basket co-purchase
--                                                grouping; logical "cart id")
--   * sales             +sale_event_id          (link sales rows that came
--                                                from one cart together)

BEGIN;

-- ── stores: GPS + cash balance ──────────────────────────────────────────────
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS lat            numeric(9, 6),
  ADD COLUMN IF NOT EXISTS lng            numeric(9, 6),
  ADD COLUMN IF NOT EXISTS cash_balance   numeric(12, 2),
  ADD COLUMN IF NOT EXISTS cash_balance_updated_at timestamptz;

-- ── restocks: planned-vs-actual delivery + invoice trend ────────────────────
ALTER TABLE restocks
  ADD COLUMN IF NOT EXISTS ordered_at                  timestamptz,
  ADD COLUMN IF NOT EXISTS ordered_qty                 numeric(10, 3),
  ADD COLUMN IF NOT EXISTS supplier_invoice_change_pct numeric(6, 3);

-- ── price_changes: every shelf-price update logged ──────────────────────────
CREATE TABLE IF NOT EXISTS price_changes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id)   ON DELETE CASCADE,
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price   numeric(10, 2) NOT NULL,
  new_price   numeric(10, 2) NOT NULL,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  /** Snapshot of qty sold over the 7d before the change — baseline for the
   *  post-change velocity comparison done by F-P-02. */
  baseline_7d_qty numeric(10, 3),
  /** Set by the F-P-02 evaluator after 7 days. NULL = not yet evaluated. */
  post_change_7d_qty   numeric(10, 3),
  velocity_lift_pct    numeric(8, 3),
  evaluated_at         timestamptz
);

CREATE INDEX IF NOT EXISTS price_changes_store_idx   ON price_changes(store_id);
CREATE INDEX IF NOT EXISTS price_changes_product_idx ON price_changes(product_id);

ALTER TABLE price_changes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members_price_changes" ON price_changes;
CREATE POLICY "members_price_changes" ON price_changes
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

-- ── ai_advisor_usage: per-user-per-day message count ────────────────────────
CREATE TABLE IF NOT EXISTS ai_advisor_usage (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day        date NOT NULL,
  count      integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);

ALTER TABLE ai_advisor_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "self_advisor_usage" ON ai_advisor_usage;
CREATE POLICY "self_advisor_usage" ON ai_advisor_usage
  FOR ALL USING (user_id = auth.uid());

-- ── sale_events: groups sales rows that came from one cart submission ──────
-- The cashier UI submits a cart of N items; right now they're inserted as
-- N independent sales rows with no link between them. F-A-03 (basket
-- analysis) needs to know which items were bought together. Going forward,
-- recordCartAction stamps every line with the same sale_event_id.
CREATE TABLE IF NOT EXISTS sale_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  payment_method text,
  total       numeric(12, 2)
);

CREATE INDEX IF NOT EXISTS sale_events_store_idx ON sale_events(store_id, recorded_at DESC);

ALTER TABLE sale_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "members_sale_events" ON sale_events;
CREATE POLICY "members_sale_events" ON sale_events
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS sale_event_id uuid REFERENCES sale_events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sales_event_idx ON sales(sale_event_id);

COMMIT;
