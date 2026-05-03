-- ============================================================
-- STOKI — Migration 017: Manual / off-book sales
-- Lets the cashier record a sale that isn't tied to a product in inventory:
-- a custom-typed item ("ice from the fridge", "extra plastic bag") with a
-- price set on the spot. The new product_name column carries the typed
-- description for these rows; the existing products(name) join still wins
-- for normal product-linked sales, so receipts continue to show the catalogue
-- name when one exists.
--
-- product_id is already nullable on sales (since 001) — this migration just
-- adds the supplementary text column.
-- ============================================================

ALTER TABLE sales ADD COLUMN IF NOT EXISTS product_name text;
