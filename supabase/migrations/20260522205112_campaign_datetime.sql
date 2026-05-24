-- =============================================================================
-- CAMPAIGN DATE-TIME — Add start/end timestamps to disaster_events
-- =============================================================================
--
-- starts_at: when the relief operation officially begins (NULL = immediate)
-- ends_at:   when the relief operation officially ends  (NULL = open-ended)
--
-- Both columns are nullable so existing rows are unaffected.
-- The application auto-closes ACTIVE events where ends_at <= now() on fetch.
-- =============================================================================

ALTER TABLE public.disaster_events
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS ends_at   TIMESTAMP WITH TIME ZONE;

-- Prevent accidental mis-configuration at the DB level
ALTER TABLE public.disaster_events
  ADD CONSTRAINT chk_campaign_window
    CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at);

-- Speeds up the server-side auto-close query on every fetchDisasters() call
CREATE INDEX IF NOT EXISTS idx_disaster_events_autoclose
  ON public.disaster_events (status, ends_at)
  WHERE status = 'ACTIVE' AND ends_at IS NOT NULL;

-- Patch existing seed rows with realistic demo dates
UPDATE public.disaster_events SET
  starts_at = '2026-05-10T08:00:00Z',
  ends_at   = NULL
WHERE system_code = 'TY-2026-001';

UPDATE public.disaster_events SET
  starts_at = '2026-04-22T14:30:00Z',
  ends_at   = NULL
WHERE system_code = 'EQ-2026-003';

UPDATE public.disaster_events SET
  starts_at = '2026-03-15T06:00:00Z',
  ends_at   = '2026-04-15T23:59:59Z'
WHERE system_code = 'FL-2026-007';

UPDATE public.disaster_events SET
  starts_at = '2026-05-14T10:00:00Z',
  ends_at   = NULL
WHERE system_code = 'TY-2026-009';

