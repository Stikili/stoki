-- STOKI — Migration 040: public waitlist for paid tiers
--
-- Stub table that captures early-interest signups against Pro / Business
-- tiers before real ZAR billing (Ozow) is live. Once Ozow lands and we
-- unhide the paid CTAs, we email everyone on this list.
--
-- Access model:
--   - anon can INSERT (public form on /pricing) via RLS policy
--   - authenticated users can SELECT ONLY their own signup rows
--   - service role (server-side admin) has full access for outreach
--
-- Rate limiting for the public form is handled at the API layer via
-- lib/rate-limit.ts — RLS INSERT policy allows unlimited attempts by
-- design (the /api route caps by IP before hitting the DB).

BEGIN;

CREATE TABLE IF NOT EXISTS waitlist_signups (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  plan       text NOT NULL,
  notes      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT waitlist_signups_plan_valid CHECK (plan IN ('pro', 'business', 'enterprise')),
  CONSTRAINT waitlist_signups_email_format CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  -- Dedupe: one signup per (email, plan). Trying to re-sign returns a
  -- "you're already on the list" from the app layer rather than a 500.
  CONSTRAINT waitlist_signups_email_plan_unique UNIQUE (email, plan)
);

-- Reverse-chronological index — outreach queries hit "most recent N"
CREATE INDEX IF NOT EXISTS waitlist_signups_created_desc_idx
  ON waitlist_signups (created_at DESC);

-- Plan-scoped index — "show me everyone waiting for Pro" is the
-- most common outreach query when a specific tier goes live.
CREATE INDEX IF NOT EXISTS waitlist_signups_plan_idx
  ON waitlist_signups (plan);

ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Anonymous visitors can insert (public form). No cross-row leakage risk
-- since anon has no SELECT policy.
DROP POLICY IF EXISTS waitlist_signups_insert_anon ON waitlist_signups;
CREATE POLICY waitlist_signups_insert_anon
  ON waitlist_signups
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Authenticated users can see their own row (useful for a future
-- "you're already on the list" UI check based on session email).
-- No policy = no access, so no anon SELECT is granted anywhere.
DROP POLICY IF EXISTS waitlist_signups_select_own ON waitlist_signups;
CREATE POLICY waitlist_signups_select_own
  ON waitlist_signups
  FOR SELECT
  TO authenticated
  USING (email = (auth.jwt() ->> 'email'));

COMMIT;
