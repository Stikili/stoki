-- STOKI — Migration 037: Clean slate (purge ALL stores)
--
-- Hard-delete every row in `stores`, cascading through every FK-linked
-- table (store_users, customers, debtors, products, sales, expenses,
-- alerts, restocks, suppliers, invoices, payables, purchase_orders,
-- payroll, fixed_assets, broadcasts, etc. — see migration 008 for the
-- ON DELETE CASCADE topology).
--
-- Pre-launch reset to take the DB back to a virgin state. Users in
-- auth.users are preserved — they can still log in, but will land on
-- /onboarding because they have zero stores. Catalog data
-- (starter_products), market indicators, and global counters are
-- untouched (they're not FK-linked to stores).
--
-- IRREVERSIBLE. The preview SELECT at the top is the LAST chance to
-- bail — once the DELETE fires, nothing comes back.

BEGIN;

-- 1) Preview every store about to be deleted + child-row counts.
--    Read this output carefully before letting the transaction commit.
SELECT
  s.id,
  s.name,
  s.owner_id,
  s.is_demo,
  s.created_at,
  (SELECT count(*) FROM customers       WHERE store_id = s.id) AS customers,
  (SELECT count(*) FROM debtors         WHERE store_id = s.id) AS debtors,
  (SELECT count(*) FROM products        WHERE store_id = s.id) AS products,
  (SELECT count(*) FROM sales           WHERE store_id = s.id) AS sales,
  (SELECT count(*) FROM expenses        WHERE store_id = s.id) AS expenses,
  (SELECT count(*) FROM alerts          WHERE store_id = s.id) AS alerts,
  (SELECT count(*) FROM store_users     WHERE store_id = s.id) AS store_users
FROM stores s
ORDER BY s.created_at;

-- 2) Totals headline — gut-check the blast radius in one row.
SELECT
  (SELECT count(*) FROM stores)        AS total_stores,
  (SELECT count(*) FROM store_users)   AS total_memberships,
  (SELECT count(*) FROM customers)     AS total_customers,
  (SELECT count(*) FROM debtors)       AS total_debtors,
  (SELECT count(*) FROM products)      AS total_products,
  (SELECT count(*) FROM sales)         AS total_sales,
  (SELECT count(*) FROM expenses)      AS total_expenses;

-- 3) Hard delete. Cascade fans out via every FK in migration 008.
DELETE FROM stores;

-- 4) Confirm — every row should be 0.
SELECT
  (SELECT count(*) FROM stores)        AS remaining_stores,
  (SELECT count(*) FROM store_users)   AS remaining_memberships,
  (SELECT count(*) FROM customers)     AS remaining_customers,
  (SELECT count(*) FROM debtors)       AS remaining_debtors,
  (SELECT count(*) FROM products)      AS remaining_products,
  (SELECT count(*) FROM sales)         AS remaining_sales,
  (SELECT count(*) FROM expenses)      AS remaining_expenses;

COMMIT;
