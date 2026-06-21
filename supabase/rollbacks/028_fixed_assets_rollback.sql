-- STOKI — Rollback for migration 028 (fixed assets + depreciation)
--
-- Drops both tables. ON DELETE CASCADE on depreciation_entries.asset_id
-- means dropping fixed_assets first is OK but the explicit order here is
-- safer and self-documenting.
--
-- DATA LOSS WARNING: every fixed_asset row and every depreciation_entry
-- row in every store is destroyed. Run only when reverting the feature
-- entirely; for fixing a single bad row, prefer a targeted UPDATE/DELETE.

BEGIN;

DROP TABLE IF EXISTS depreciation_entries;
DROP TABLE IF EXISTS fixed_assets;

COMMIT;
