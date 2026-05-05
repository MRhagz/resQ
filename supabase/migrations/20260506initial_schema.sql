-- 1. Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Staff Profiles (Linked to Supabase Auth)
CREATE TABLE public.staff_profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  role TEXT CHECK (role IN ('super_admin', 'relief_worker')) NOT NULL,
  assigned_location JSONB, -- Tracks Region/Province/Municipality they are locked into
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Campaigns (Disaster Events)
CREATE TABLE public.disaster_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  system_code TEXT UNIQUE NOT NULL, -- e.g., TY-2026-001
  name TEXT NOT NULL,
  status TEXT CHECK (status IN ('ACTIVE', 'CLOSED')) DEFAULT 'ACTIVE',
  allowed_regions JSONB NOT NULL, -- Geofencing limits
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Beneficiaries (Strictly Zero PII)
CREATE TABLE public.beneficiaries (
  system_uuid UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  id_hash TEXT UNIQUE NOT NULL, 
  
  -- Tracks HOW they entered the system ('WEB_PUBLIC' vs 'ONSITE_STAFF')
  registration_source TEXT NOT NULL, 
  
  -- Optional: Broad data like {"region": "NCR", "province": "Manila"}
  -- Notice there is NO "NOT NULL" here. It can be empty.
  general_demographics JSONB, 
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Claims (The Primary Distribution Ledger)
CREATE TABLE public.claims (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  beneficiary_uuid UUID REFERENCES public.beneficiaries(system_uuid) NOT NULL,
  disaster_event_id UUID REFERENCES public.disaster_events(id) NOT NULL,
  aid_type TEXT NOT NULL, -- e.g., 'Food Ration', 'Medical Kit'
  relief_worker_id UUID REFERENCES public.staff_profiles(id) NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- CRITICAL: This composite unique constraint prevents double-spending 
  -- at the database level, regardless of frontend UI glitches.
  UNIQUE(beneficiary_uuid, disaster_event_id, aid_type)
);

-- 6. Indexing for High-Speed Field Scans
CREATE INDEX idx_beneficiaries_hash ON public.beneficiaries(id_hash);
CREATE INDEX idx_claims_lookup ON public.claims(beneficiary_uuid, disaster_event_id);