-- ============================================================
-- STOKI — Migration 016: Address on debtors, description on credit entries
-- The credit book "add customer" form now collects: name, address, phone,
-- description, amount. Address sits on the debtor (rarely changes); the
-- description belongs to the individual credit entry (changes per loan).
-- Both columns are nullable so existing rows stay valid.
-- ============================================================

ALTER TABLE debtors        ADD COLUMN IF NOT EXISTS address     text;
ALTER TABLE credit_entries ADD COLUMN IF NOT EXISTS description text;
