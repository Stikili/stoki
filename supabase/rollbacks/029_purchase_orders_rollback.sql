-- STOKI — Rollback for migration 029 (purchase orders → goods receipt)
--
-- Drops both tables and the per-store PO counter column. Existing
-- claim_next_po_no() RPC function is dropped too — it references the
-- stores.next_po_no column we're removing.
--
-- DATA LOSS WARNING: every PO and every PO line in every store is
-- destroyed. The next_po_no counter is also gone, so re-applying
-- migration 029 will restart PO numbering at 1.

BEGIN;

DROP FUNCTION IF EXISTS claim_next_po_no(uuid);
DROP TABLE IF EXISTS purchase_order_lines;
DROP TABLE IF EXISTS purchase_orders;
ALTER TABLE stores DROP COLUMN IF EXISTS next_po_no;

COMMIT;
