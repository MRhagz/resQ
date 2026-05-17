-- =============================================================================
-- CLAIM STUBS — Unified associative entity for aid distribution
-- =============================================================================
--
-- Lifecycle:
--   1. Admin selects eligible beneficiaries → INSERT claim_stubs (claimed=false)
--   2. Worker scans national ID at distribution → UPDATE claimed=true
--
-- This replaces both token_rulings and claims tables.
-- =============================================================================

-- 1. Add agency column to staff_profiles (if not exists)
ALTER TABLE public.staff_profiles
  ADD COLUMN IF NOT EXISTS agency TEXT;

-- 2. Drop old tables
DROP TABLE IF EXISTS public.token_rulings CASCADE;
DROP TABLE IF EXISTS public.claims CASCADE;

-- 3. Create claim_stubs
CREATE TABLE public.claim_stubs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- The beneficiary this stub is for
  beneficiary_uuid UUID REFERENCES public.beneficiaries(system_uuid) NOT NULL,

  -- Which disaster + aid type
  disaster_event_id UUID REFERENCES public.disaster_events(id) NOT NULL,
  aid_type TEXT NOT NULL,

  -- Admin who approved this stub
  approved_by UUID REFERENCES public.staff_profiles(id) NOT NULL,
  agency TEXT NOT NULL,

  -- Distribution lifecycle
  claimed BOOLEAN DEFAULT false,
  claimed_by UUID REFERENCES public.staff_profiles(id),
  claimed_at TIMESTAMP WITH TIME ZONE,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- One stub per beneficiary per disaster per aid type
  UNIQUE(beneficiary_uuid, disaster_event_id, aid_type)
);

-- 4. Indexes
CREATE INDEX idx_stubs_beneficiary ON public.claim_stubs(beneficiary_uuid);
CREATE INDEX idx_stubs_disaster ON public.claim_stubs(disaster_event_id);
CREATE INDEX idx_stubs_unclaimed ON public.claim_stubs(beneficiary_uuid, disaster_event_id, aid_type) WHERE claimed = false;

-- 5. RLS
ALTER TABLE public.claim_stubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert stubs"
  ON public.claim_stubs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_profiles
      WHERE staff_profiles.id = auth.uid() AND staff_profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Staff can read all stubs"
  ON public.claim_stubs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Workers can claim stubs"
  ON public.claim_stubs FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_profiles
      WHERE staff_profiles.id = auth.uid()
    )
  );
