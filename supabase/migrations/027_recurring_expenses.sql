-- STOKI — Migration 027: Recurring expenses
--
-- A recurring rule (rent, electricity, insurance, subscription, weekly
-- transport) auto-creates expense rows on schedule. The rule itself is
-- never an expense — it spawns expenses. `next_due_at` is denormalised
-- so the cron query stays a cheap index seek; the app advances it after
-- posting and falls back to lazy-post at /expenses load if cron is dark.

BEGIN;

CREATE TABLE IF NOT EXISTS recurring_expenses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  category        text NOT NULL,
  description     text NOT NULL,
  amount          numeric(10,2) NOT NULL CHECK (amount > 0),
  is_capital      boolean NOT NULL DEFAULT false,
  -- 'monthly' or 'weekly'. Daily/yearly are out of scope for v1.
  frequency       text NOT NULL CHECK (frequency IN ('monthly', 'weekly')),
  -- For monthly: day-of-month (1..31, clamps to month length at post time).
  -- For weekly:  day-of-week  (0=Sun .. 6=Sat).
  day_value       integer NOT NULL CHECK (day_value BETWEEN 0 AND 31),
  -- Next time this rule should spawn an expense. Index target.
  next_due_at     timestamptz NOT NULL,
  last_posted_at  timestamptz,
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS recurring_expenses_due_idx
  ON recurring_expenses(store_id, next_due_at)
  WHERE deleted_at IS NULL AND active = true;

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_recurring_expenses" ON recurring_expenses;
CREATE POLICY "members_recurring_expenses" ON recurring_expenses
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

CREATE TRIGGER recurring_expenses_updated_at
  BEFORE UPDATE ON recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
