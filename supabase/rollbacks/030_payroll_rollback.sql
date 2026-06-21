-- STOKI — Rollback for migration 030 (payroll lite)
--
-- Drops all three payroll tables. CASCADE chain on the FKs means dropping
-- payslip_lines first then payroll_runs then employees works without
-- explicit cascades, but the explicit order is safer.
--
-- DATA LOSS WARNING: every employee record, every monthly payroll run
-- and every payslip line in every store is destroyed. Past SARS
-- submissions are unaffected (those live with SARS, not here) but the
-- audit trail for what Stoki calculated is gone.

BEGIN;

DROP TABLE IF EXISTS payslip_lines;
DROP TABLE IF EXISTS payroll_runs;
DROP TABLE IF EXISTS employees;

COMMIT;
