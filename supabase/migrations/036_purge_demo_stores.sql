-- STOKI — Migration 036: Purge demo stores
--
-- Hard-delete every store flagged `is_demo = true`, cascading to every
-- child table (customers, debtors, products, sales, expenses, alerts,
-- store_users, etc. — see migration 008 for the FK / ON DELETE CASCADE
-- topology). Earlier soft-delete (deleted_at = now() via SQL run on
-- 2026-06-25) hid the rows from the app but left them in Postgres,
-- bloating the DB and polluting any future analytics off prod data.
--
-- Auto-seeding of demo stores was disabled in code on 2026-06-26
-- (commit e6330f0), so no new is_demo rows will appear. This migration
-- closes the loop by removing the historical ones.
--
-- IRREVERSIBLE. Run the SELECT block first to preview the blast radius
-- before committing — there is no rollback once `delete from stores`
-- fires.

BEGIN;

-- 1) Preview — counts per demo store of what cascades will remove.
--    Wrap in a transaction so the SELECT runs at the same snapshot
--    as the DELETE that follows. (Postgres prints SELECT output even
--    inside a transaction.)
SELECT
  s.id,
  s.name,
  s.owner_id,
  (SELECT count(*) FROM customers       WHERE store_id = s.id) AS customers,
  (SELECT count(*) FROM debtors         WHERE store_id = s.id) AS debtors,
  (SELECT count(*) FROM products        WHERE store_id = s.id) AS products,
  (SELECT count(*) FROM sales           WHERE store_id = s.id) AS sales,
  (SELECT count(*) FROM expenses        WHERE store_id = s.id) AS expenses,
  (SELECT count(*) FROM alerts          WHERE store_id = s.id) AS alerts,
  (SELECT count(*) FROM store_users     WHERE store_id = s.id) AS store_users
FROM stores s
WHERE s.is_demo = true
ORDER BY s.created_at;

-- 2) Hard delete. Cascade fans out via the FKs added in migration 008.
DELETE FROM stores WHERE is_demo = true;

-- 3) Confirm — should print 0.
SELECT count(*) AS remaining_demo_rows
FROM stores
WHERE is_demo = true;

COMMIT;
