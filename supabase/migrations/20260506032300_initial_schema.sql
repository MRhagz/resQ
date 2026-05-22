-- ============================================================================
-- resQ — Initial Schema
-- ============================================================================
-- Creates all tables, sequences, constraints, foreign keys, and indexes.
-- This is a fresh, consolidated schema derived from the application source code.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Sequences for auto-incrementing wallet derivation indexes
-- ----------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS staff_wallet_index_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS beneficiary_wallet_index_seq START WITH 1 INCREMENT BY 1;

-- ----------------------------------------------------------------------------
-- Table: staff_profiles
-- Stores staff/admin accounts linked to Supabase Auth.
-- Roles: super_admin (agency admins), relief_worker (field workers).
-- ----------------------------------------------------------------------------

CREATE TABLE public.staff_profiles (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('super_admin', 'relief_worker')),
  agency          text,
  wallet_index    integer     DEFAULT nextval('staff_wallet_index_seq'),
  wallet_address  text,
  tx_hash         text,
  created_at      timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE  public.staff_profiles              IS 'Staff accounts (admins and relief workers).';
COMMENT ON COLUMN public.staff_profiles.role          IS 'super_admin or relief_worker.';
COMMENT ON COLUMN public.staff_profiles.agency        IS 'Agency name — required for super_admins, null for workers.';
COMMENT ON COLUMN public.staff_profiles.wallet_index  IS 'HD wallet derivation index (auto-assigned).';
COMMENT ON COLUMN public.staff_profiles.wallet_address IS 'Derived Cardano wallet address (populated async after signup).';
COMMENT ON COLUMN public.staff_profiles.tx_hash       IS 'Identity NFT minting transaction hash.';

-- ----------------------------------------------------------------------------
-- Table: disaster_events
-- Tracks disaster relief campaigns created by admins.
-- ----------------------------------------------------------------------------

CREATE TABLE public.disaster_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  system_code     text        UNIQUE NOT NULL,
  name            text        NOT NULL,
  status          text        NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
  allowed_regions jsonb       DEFAULT '[]'::jsonb,
  created_at      timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE  public.disaster_events               IS 'Disaster relief campaigns.';
COMMENT ON COLUMN public.disaster_events.system_code   IS 'Unique human-readable code, e.g. TY-2026-001.';
COMMENT ON COLUMN public.disaster_events.allowed_regions IS 'JSONB array of region names eligible for this disaster.';

-- ----------------------------------------------------------------------------
-- Table: beneficiaries
-- Zero-PII beneficiary registry. Only hashed IDs and broad demographics.
-- ----------------------------------------------------------------------------

CREATE TABLE public.beneficiaries (
  system_uuid         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  id_hash             text        UNIQUE NOT NULL,
  registration_source text        NOT NULL CHECK (registration_source IN ('WEB_PUBLIC', 'ONSITE_STAFF')),
  general_demographics jsonb      DEFAULT '{}'::jsonb,
  wallet_index        integer     DEFAULT nextval('beneficiary_wallet_index_seq'),
  wallet_address      text,
  identity_tx_hash    text,
  created_at          timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE  public.beneficiaries                     IS 'Beneficiary registry — zero PII, only hashed national IDs.';
COMMENT ON COLUMN public.beneficiaries.id_hash             IS 'SHA-256 hash of national ID + salt.';
COMMENT ON COLUMN public.beneficiaries.registration_source IS 'WEB_PUBLIC (self-register) or ONSITE_STAFF (field worker).';
COMMENT ON COLUMN public.beneficiaries.general_demographics IS 'JSONB with region, display_name, barangay, is_disaster_affected.';
COMMENT ON COLUMN public.beneficiaries.wallet_index        IS 'HD wallet derivation index (auto-assigned).';
COMMENT ON COLUMN public.beneficiaries.wallet_address      IS 'Derived Cardano custodial wallet address.';
COMMENT ON COLUMN public.beneficiaries.identity_tx_hash    IS 'Identity NFT minting transaction hash.';

-- ----------------------------------------------------------------------------
-- Table: claim_stubs
-- Aid entitlements created by admins and redeemed by field workers.
-- Each stub = one unit of aid for one beneficiary in one disaster.
-- ----------------------------------------------------------------------------

CREATE TABLE public.claim_stubs (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_uuid  uuid        NOT NULL REFERENCES public.beneficiaries(system_uuid),
  disaster_event_id uuid        NOT NULL REFERENCES public.disaster_events(id),
  aid_type          text        NOT NULL,
  agency            text        NOT NULL,
  approved_by       uuid        NOT NULL REFERENCES public.staff_profiles(id),
  claimed           boolean     DEFAULT false NOT NULL,
  claimed_by        uuid        REFERENCES public.staff_profiles(id),
  claimed_at        timestamptz,
  mint_tx_hash      text,
  burn_tx_hash      text,
  burned_at         timestamptz,
  created_at        timestamptz DEFAULT now() NOT NULL,

  -- Prevent duplicate stubs for the same beneficiary + disaster + aid type
  CONSTRAINT unique_stub_per_beneficiary_disaster_aid
    UNIQUE (beneficiary_uuid, disaster_event_id, aid_type)
);

COMMENT ON TABLE  public.claim_stubs                    IS 'Aid claim stubs — DB is source of truth, blockchain is audit trail.';
COMMENT ON COLUMN public.claim_stubs.beneficiary_uuid   IS 'FK to beneficiaries.system_uuid.';
COMMENT ON COLUMN public.claim_stubs.approved_by        IS 'Admin who created the stub.';
COMMENT ON COLUMN public.claim_stubs.claimed_by         IS 'Relief worker who distributed the aid.';
COMMENT ON COLUMN public.claim_stubs.mint_tx_hash       IS 'On-chain token minting transaction hash.';
COMMENT ON COLUMN public.claim_stubs.burn_tx_hash       IS 'On-chain token burning transaction hash (EOD reconciliation).';
COMMENT ON COLUMN public.claim_stubs.burned_at          IS 'Timestamp when the on-chain token was burned.';

-- ----------------------------------------------------------------------------
-- Indexes for common query patterns
-- ----------------------------------------------------------------------------

-- Beneficiary lookup by hash (registration dedup + worker distribution)
CREATE INDEX idx_beneficiaries_id_hash ON public.beneficiaries (id_hash);

-- Claim stub queries: unclaimed stubs, burn pipeline, beneficiary lookup
CREATE INDEX idx_claim_stubs_beneficiary ON public.claim_stubs (beneficiary_uuid);
CREATE INDEX idx_claim_stubs_disaster    ON public.claim_stubs (disaster_event_id);
CREATE INDEX idx_claim_stubs_burn_pending ON public.claim_stubs (claimed, burned_at)
  WHERE claimed = true AND burned_at IS NULL;

-- Disaster events by status (active events filter)
CREATE INDEX idx_disaster_events_status ON public.disaster_events (status);