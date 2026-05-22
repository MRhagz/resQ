-- =============================================================================
-- PUBLIC TRANSPARENCY — Allow unauthenticated read access to data
-- needed by the public transparency portal.
-- =============================================================================

-- Allow public/anonymous users to read claim stubs (for the distribution ledger)
CREATE POLICY "Allow public read claim_stubs"
  ON public.claim_stubs FOR SELECT TO public, anon
  USING (true);

-- Allow public/anonymous users to read disaster events (for context in the ledger)
CREATE POLICY "Allow public read disaster_events"
  ON public.disaster_events FOR SELECT TO public, anon
  USING (true);
