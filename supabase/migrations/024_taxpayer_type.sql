-- STOKI — Migration 024: Taxpayer type
--
-- Drives the provisional-tax estimator (see app/src/lib/tax/provisional.ts).
-- SA SMMEs fall into four SARS classifications:
--   sole_prop     — personal income tax on net business profit (most spazas)
--   sbc           — Small Business Corporation: graduated 0/7/21/27 % rates
--   turnover_tax  — Micro Business Turnover Tax: registered T/O ≤ R1m
--   company       — Standard 27 % company tax
--
-- Default sole_prop captures the most common case for the SMME segment we serve.

BEGIN;

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS taxpayer_type text NOT NULL DEFAULT 'sole_prop';

ALTER TABLE stores DROP CONSTRAINT IF EXISTS stores_taxpayer_type_check;
ALTER TABLE stores ADD CONSTRAINT stores_taxpayer_type_check
  CHECK (taxpayer_type IN ('sole_prop', 'sbc', 'turnover_tax', 'company'));

COMMIT;
