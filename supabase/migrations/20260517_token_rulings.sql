-- =============================================================================
-- TOKEN RULINGS — Off-chain audit trail for token distribution decisions
-- =============================================================================
-- 
-- This table records every admin decision to distribute tokens BEFORE
-- any distribution occurs. It serves as a permanent, queryable audit trail:
--   - WHO approved the distribution (admin_id)
--   - FOR WHICH disaster event
--   - WHAT type of aid
--   - TO WHOM (beneficiary reference)
--   - UNDER WHAT CRITERIA (eligibility snapshot at ruling time)
--   - WHICH AGENCY (auto-populated from staff_profiles.agency)
-- =============================================================================

-- 1. Add agency column to staff_profiles
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS agency TEXT;

-- 2. Token rulings table
CREATE TABLE public.token_rulings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Who approved this distribution
  admin_id UUID REFERENCES public.staff_profiles(id) NOT NULL,

  -- Which disaster event this is for
  disaster_event_id UUID REFERENCES public.disaster_events(id) NOT NULL,

  -- What type of aid is being distributed
  aid_type TEXT NOT NULL,

  -- Agency is auto-populated from the admin's staff_profiles.agency
  agency TEXT NOT NULL,

  -- The beneficiary receiving the token (references mock ID or system_uuid)
  beneficiary_id TEXT NOT NULL,

  -- Snapshot of the eligibility criteria that were active when the ruling was made.
  -- This is critical for auditing: even if a beneficiary's data changes later,
  -- we know exactly what conditions the admin used to approve them.
  -- Format: { "region": "NCR", "is_disaster_affected": "yes" }
  eligibility_criteria JSONB NOT NULL,

  -- Ruling status: tracks the lifecycle of this distribution decision
  ruling_status TEXT CHECK (ruling_status IN ('APPROVED', 'DISTRIBUTED', 'REJECTED', 'REVOKED')) DEFAULT 'APPROVED',

  -- Timestamps
  ruled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  distributed_at TIMESTAMP WITH TIME ZONE,

  -- Prevent duplicate rulings for same beneficiary/disaster/aid combo
  UNIQUE(beneficiary_id, disaster_event_id, aid_type)
);

-- Indexes for common query patterns
CREATE INDEX idx_rulings_admin ON public.token_rulings(admin_id);
CREATE INDEX idx_rulings_disaster ON public.token_rulings(disaster_event_id);
CREATE INDEX idx_rulings_status ON public.token_rulings(ruling_status);
CREATE INDEX idx_rulings_beneficiary ON public.token_rulings(beneficiary_id);

-- =============================================================================
-- RLS Policies for token_rulings
-- =============================================================================
ALTER TABLE public.token_rulings ENABLE ROW LEVEL SECURITY;

-- Only admins can insert rulings
CREATE POLICY "Allow admins to insert rulings"
  ON public.token_rulings FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles
      WHERE staff_profiles.id = auth.uid() AND staff_profiles.role = 'super_admin'
    )
  );

-- Authenticated staff can read all rulings (transparency)
CREATE POLICY "Allow staff to read rulings"
  ON public.token_rulings FOR SELECT TO authenticated
  USING (true);

-- Only admins can update ruling status (e.g., mark as DISTRIBUTED or REVOKED)
CREATE POLICY "Allow admins to update rulings"
  ON public.token_rulings FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles
      WHERE staff_profiles.id = auth.uid() AND staff_profiles.role = 'super_admin'
    )
  );
