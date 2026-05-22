-- ============================================================================
-- resQ — Row Level Security Policies
-- ============================================================================
-- Enables RLS on all tables and creates policies for authenticated access.
-- Background tasks use the service_role key which bypasses RLS entirely.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enable RLS on all tables
-- ----------------------------------------------------------------------------

ALTER TABLE public.staff_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disaster_events  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beneficiaries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_stubs      ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- staff_profiles
-- Users can read any profile (needed for role checks) and insert their own.
-- Updates limited to own row (wallet address populated by background task
-- via service_role, so no RLS policy needed for that path).
-- ----------------------------------------------------------------------------

CREATE POLICY "staff_profiles: anyone authenticated can read"
  ON public.staff_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "staff_profiles: users can insert own profile"
  ON public.staff_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "staff_profiles: users can update own profile"
  ON public.staff_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- disaster_events
-- All authenticated users can read. Insert/update allowed for all authenticated
-- users (authorization enforced in application code by checking role).
-- ----------------------------------------------------------------------------

CREATE POLICY "disaster_events: anyone authenticated can read"
  ON public.disaster_events FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "disaster_events: authenticated users can insert"
  ON public.disaster_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "disaster_events: authenticated users can update"
  ON public.disaster_events FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- beneficiaries
-- All authenticated users can read, insert, and update.
-- Workers register beneficiaries; background tasks update wallet addresses.
-- ----------------------------------------------------------------------------

CREATE POLICY "beneficiaries: anyone authenticated can read"
  ON public.beneficiaries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "beneficiaries: authenticated users can insert"
  ON public.beneficiaries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "beneficiaries: authenticated users can update"
  ON public.beneficiaries FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- claim_stubs
-- All authenticated users can read, insert, and update.
-- Admins create stubs; workers redeem them; background tasks update tx hashes.
-- ----------------------------------------------------------------------------

CREATE POLICY "claim_stubs: anyone authenticated can read"
  ON public.claim_stubs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "claim_stubs: authenticated users can insert"
  ON public.claim_stubs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "claim_stubs: authenticated users can update"
  ON public.claim_stubs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
