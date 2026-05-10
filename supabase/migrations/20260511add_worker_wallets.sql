-- Migration to add HD wallet tracking to staff_profiles for seamless wallet integration
-- This uses a BIGSERIAL to automatically provide a unique sequential index for every new worker

ALTER TABLE public.staff_profiles
ADD COLUMN IF NOT EXISTS wallet_index BIGSERIAL UNIQUE,
ADD COLUMN IF NOT EXISTS wallet_address TEXT,
ADD COLUMN IF NOT EXISTS tx_hash TEXT;

-- Create an index to quickly lookup staff by wallet address if needed
CREATE INDEX IF NOT EXISTS idx_staff_wallet ON public.staff_profiles(wallet_address);
