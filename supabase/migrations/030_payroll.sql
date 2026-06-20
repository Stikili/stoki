-- STOKI — Migration 030: Payroll lite
--
-- Monthly SA payroll for SMMEs: employees, payroll runs, payslip lines.
-- The runs table holds aggregates per period; payslip rows hold the
-- per-employee breakdown that drives the EMP201 monthly submission.
--
-- PAYE math uses the same personal-income-tax brackets as the provisional-tax
-- estimator (lib/tax/sa-brackets.ts) — single source of truth for SARS rates.
-- UIF: 1% employer + 1% employee, capped at R17,712 monthly remuneration.
-- SDL: 1% of total payroll, only if annual payroll exceeds R500k threshold.

BEGIN;

CREATE TABLE IF NOT EXISTS employees (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name            text NOT NULL,
  id_number       text,
  -- Monthly base salary (gross, before deductions).
  base_salary     numeric(12,2) NOT NULL CHECK (base_salary >= 0),
  hire_date       date NOT NULL,
  end_date        date,
  -- Some employees opt out of UIF (sole-prop owner, foreign workers — rare).
  uif_enrolled    boolean NOT NULL DEFAULT true,
  active          boolean NOT NULL DEFAULT true,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX IF NOT EXISTS employees_store_active_idx
  ON employees(store_id, active) WHERE deleted_at IS NULL;

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_employees" ON employees;
CREATE POLICY "members_employees" ON employees
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS payroll_runs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  -- Period anchor — last day of the payroll month.
  period_of           date NOT NULL,
  total_gross         numeric(12,2) NOT NULL DEFAULT 0,
  total_paye          numeric(12,2) NOT NULL DEFAULT 0,
  total_uif_employee  numeric(12,2) NOT NULL DEFAULT 0,
  total_uif_employer  numeric(12,2) NOT NULL DEFAULT 0,
  total_sdl           numeric(12,2) NOT NULL DEFAULT 0,
  total_net           numeric(12,2) NOT NULL DEFAULT 0,
  status              text NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'final')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, period_of)
);

CREATE INDEX IF NOT EXISTS payroll_runs_store_period_idx
  ON payroll_runs(store_id, period_of DESC);

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_payroll_runs" ON payroll_runs;
CREATE POLICY "members_payroll_runs" ON payroll_runs
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

CREATE TRIGGER payroll_runs_updated_at
  BEFORE UPDATE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS payslip_lines (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id              uuid NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  store_id            uuid NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  employee_id         uuid NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  gross               numeric(12,2) NOT NULL,
  paye                numeric(12,2) NOT NULL,
  uif_employee        numeric(12,2) NOT NULL,
  uif_employer        numeric(12,2) NOT NULL,
  sdl                 numeric(12,2) NOT NULL,
  net                 numeric(12,2) NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, employee_id)
);

CREATE INDEX IF NOT EXISTS payslip_lines_run_idx ON payslip_lines(run_id);
CREATE INDEX IF NOT EXISTS payslip_lines_store_idx ON payslip_lines(store_id);

ALTER TABLE payslip_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_payslip_lines" ON payslip_lines;
CREATE POLICY "members_payslip_lines" ON payslip_lines
  FOR ALL USING (store_id IN (SELECT my_store_ids()));

COMMIT;
