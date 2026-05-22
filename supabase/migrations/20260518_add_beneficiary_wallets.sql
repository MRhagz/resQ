-- =============================================================================
-- ADD WALLET TRACKING TO BENEFICIARIES
-- =============================================================================
--
-- Mirrors the staff_profiles wallet pattern for beneficiaries:
--   wallet_index     — Sequential HD key index for custodial wallet derivation
--   wallet_address   — Cached bech32 address to avoid re-derivation
--   identity_tx_hash — TX hash from Identity NFT minting
-- =============================================================================

ALTER TABLE public.beneficiaries
  ADD COLUMN IF NOT EXISTS wallet_index BIGSERIAL UNIQUE,
  ADD COLUMN IF NOT EXISTS wallet_address TEXT,
  ADD COLUMN IF NOT EXISTS identity_tx_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_beneficiary_wallet ON public.beneficiaries(wallet_address);
