-- =============================================================================
-- ADD BLOCKCHAIN AUDIT COLUMNS TO CLAIM_STUBS
-- =============================================================================
--
-- Tracks the on-chain lifecycle of each claim stub token:
--   mint_tx_hash  — TX hash from when the token was minted (createClaimStubs)
--   burn_tx_hash  — TX hash from when the token was burned (EOD batch)
--   burned_at     — Timestamp of the burn for reconciliation
-- =============================================================================

ALTER TABLE public.claim_stubs
  ADD COLUMN IF NOT EXISTS mint_tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS burn_tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS burned_at TIMESTAMP WITH TIME ZONE;

-- Index for the EOD burn pipeline: find claimed-but-not-yet-burned stubs
CREATE INDEX IF NOT EXISTS idx_stubs_pending_burn
  ON public.claim_stubs(claimed, burned_at)
  WHERE claimed = true AND burned_at IS NULL;
