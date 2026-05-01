-- ============================================================
-- STOKI — Migration 008: Multi-user with roles
-- Adds:
--   * store_users table — many-to-many between users and stores with a role
--   * Bootstrap: every existing store owner becomes a member with role='owner'
--   * Helper functions: my_store_ids(), my_store_role(store_id)
--   * RLS on every store-scoped table rewritten from owner_id checks to
--     store_users membership, so invited users can access store data.
-- ============================================================

-- 1) store_users
CREATE TABLE IF NOT EXISTS store_users (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('owner', 'manager', 'cashier')),
  invited_by  uuid REFERENCES auth.users(id),
  joined_at   timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);

CREATE INDEX IF NOT EXISTS store_users_user_idx  ON store_users(user_id);
CREATE INDEX IF NOT EXISTS store_users_store_idx ON store_users(store_id);

-- 2) Bootstrap existing owners into store_users
INSERT INTO store_users (store_id, user_id, role, joined_at)
SELECT s.id, s.owner_id, 'owner', s.created_at
FROM stores s
WHERE s.owner_id IS NOT NULL
ON CONFLICT (store_id, user_id) DO NOTHING;

-- 3) Helper functions
CREATE OR REPLACE FUNCTION my_store_ids() RETURNS SETOF uuid AS $$
  SELECT store_id FROM store_users WHERE user_id = auth.uid()
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION my_store_role(p_store_id uuid) RETURNS text AS $$
  SELECT role FROM store_users
  WHERE user_id = auth.uid() AND store_id = p_store_id
  LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Keep my_store_id() — first store user is a member of (used by some legacy spots).
CREATE OR REPLACE FUNCTION my_store_id() RETURNS uuid AS $$
  SELECT store_id FROM store_users WHERE user_id = auth.uid() LIMIT 1
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4) RLS on store_users itself
ALTER TABLE store_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_view_own_membership" ON store_users;
CREATE POLICY "members_view_own_membership" ON store_users
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "team_view_members" ON store_users;
CREATE POLICY "team_view_members" ON store_users
  FOR SELECT USING (
    store_id IN (
      SELECT store_id FROM store_users WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners_manage_team" ON store_users;
CREATE POLICY "owners_manage_team" ON store_users
  FOR ALL USING (
    store_id IN (
      SELECT store_id FROM store_users WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- 5) Rewrite RLS on store-scoped data tables to use membership.
-- Wrap each in DROP IF EXISTS / CREATE so this migration is idempotent.

DROP POLICY IF EXISTS "owner_products"        ON products;
DROP POLICY IF EXISTS "members_products"      ON products;
CREATE POLICY "members_products" ON products
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

DROP POLICY IF EXISTS "owner_sales"           ON sales;
DROP POLICY IF EXISTS "members_sales"         ON sales;
CREATE POLICY "members_sales" ON sales
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

DROP POLICY IF EXISTS "owner_restocks"        ON restocks;
DROP POLICY IF EXISTS "members_restocks"      ON restocks;
CREATE POLICY "members_restocks" ON restocks
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

DROP POLICY IF EXISTS "owner_debtors"         ON debtors;
DROP POLICY IF EXISTS "members_debtors"       ON debtors;
CREATE POLICY "members_debtors" ON debtors
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

DROP POLICY IF EXISTS "owner_credit_entries"  ON credit_entries;
DROP POLICY IF EXISTS "members_credit_entries" ON credit_entries;
CREATE POLICY "members_credit_entries" ON credit_entries
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

DROP POLICY IF EXISTS "owner_alerts"          ON alerts;
DROP POLICY IF EXISTS "members_alerts"        ON alerts;
CREATE POLICY "members_alerts" ON alerts
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

DROP POLICY IF EXISTS "users manage own expenses" ON expenses;
DROP POLICY IF EXISTS "members_expenses"      ON expenses;
CREATE POLICY "members_expenses" ON expenses
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

DROP POLICY IF EXISTS "owner_suppliers"       ON suppliers;
DROP POLICY IF EXISTS "members_suppliers"     ON suppliers;
CREATE POLICY "members_suppliers" ON suppliers
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

-- 6) Stores: owner retains full access; members get SELECT only.
DROP POLICY IF EXISTS "owner_stores"      ON stores;
DROP POLICY IF EXISTS "owner_full_access" ON stores;
CREATE POLICY "owner_full_access" ON stores
  FOR ALL USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "members_view_stores" ON stores;
CREATE POLICY "members_view_stores" ON stores
  FOR SELECT USING (id IN (SELECT my_store_ids()));
