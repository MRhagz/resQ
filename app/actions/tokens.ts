'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { mintClaimStubs } from '@/lib/blockchain/mintClaimStubs.js'
import { systemWallet } from '@/lib/blockchain/wallet.js'

/**
 * CLAIM STUBS — Admin creates stubs for eligible beneficiaries.
 * Each stub = one "token" that a worker can redeem at a distribution point.
 *
 * Flow:
 *   1. Admin selects beneficiaries + disaster + aid type
 *   2. System inserts claim_stub rows into the database (source of truth)
 *   3. System mints corresponding on-chain tokens (fire-and-forget)
 *   4. Tokens are minted to the system wallet — metadata proves eligibility
 */

interface ClaimStubPayload {
  beneficiaryIds: string[]   // system_uuids
  disasterEventId: string
  aidType: string
}

export async function createClaimStubs(payload: ClaimStubPayload) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Unauthorized.' }

  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('role, agency')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') {
    return { status: 'error', message: 'Forbidden — only admins can create claim stubs.' }
  }

  const agency = profile.agency
  if (!agency) {
    return { status: 'error', message: 'Your profile has no agency assigned.' }
  }

  if (!payload.beneficiaryIds.length || !payload.disasterEventId || !payload.aidType) {
    return { status: 'error', message: 'Missing required fields.' }
  }

  // Fetch the disaster's system_code for on-chain asset naming
  const { data: disaster } = await supabase
    .from('disaster_events')
    .select('system_code')
    .eq('id', payload.disasterEventId)
    .single()

  if (!disaster) {
    return { status: 'error', message: 'Disaster event not found.' }
  }

  const rows = payload.beneficiaryIds.map((uuid) => ({
    beneficiary_uuid: uuid,
    disaster_event_id: payload.disasterEventId,
    aid_type: payload.aidType,
    approved_by: user.id,
    agency,
    claimed: false,
  }))

  const { data, error } = await supabase
    .from('claim_stubs')
    .insert(rows)
    .select('id, beneficiary_uuid')

  if (error) {
    if (error.code === '23505') {
      return { status: 'error', message: 'Some beneficiaries already have stubs for this disaster/aid combo.' }
    }
    console.error('Stub insert error:', error)
    return { status: 'error', message: error.message }
  }

  // ── Fire-and-forget: Mint on-chain claim tokens ──────────────────────
  // Tokens are minted to the system wallet (custodial model).
  // The token metadata embeds disaster code + aid type + agency as proof.
  // DB remains the source of truth; on-chain is the audit trail.
  if (data && data.length > 0) {
    mintClaimStubsInBackground(data, disaster.system_code, payload.aidType, agency)
      .catch(err => console.error('Background claim stub minting error:', err))
  }

  revalidatePath('/admin/dashboard')
  return {
    status: 'success',
    message: `Created ${data?.length ?? 0} claim stub(s) via ${agency}. Beneficiaries can now receive ${payload.aidType} at distribution points.`,
    count: data?.length ?? 0,
  }
}

const BATCH_SIZE = 20;

/**
 * Background minting — runs after the HTTP response is sent.
 * Mints claim tokens to the system wallet in sequential batches of 20 to respect Cardano transaction size limits and avoid UTxO collision.
 * On-chain metadata is what proves which beneficiary the token is for.
 */
async function mintClaimStubsInBackground(
  stubs: { id: string; beneficiary_uuid: string }[],
  disasterCode: string,
  aidType: string,
  agency: string
) {
  try {
    // All tokens go to the system wallet (custodial — beneficiaries have no wallets)
    await systemWallet.init()
    const systemAddress = await systemWallet.getChangeAddress()

    const campaign = {
      disasterCode,
      aidType,
      agency,
    }

    // Initialize Supabase direct client for background database updates
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    const { createClient: createDirectClient } = await import('@supabase/supabase-js')
    const directSupabase = createDirectClient(supabaseUrl, supabaseKey)

    // Process stubs sequentially in batches to avoid UTxO collisions and tx size limits
    for (let i = 0; i < stubs.length; i += BATCH_SIZE) {
      const batch = stubs.slice(i, i + BATCH_SIZE)
      const batchRecipients = batch.map(() => ({
        walletAddress: systemAddress
      }))

      try {
        const txHash = await mintClaimStubs(batchRecipients, campaign)

        // Persist the mint tx hash back to the DB for audit trail of this specific batch
        const batchIds = batch.map(s => s.id)
        await directSupabase
          .from('claim_stubs')
          .update({ mint_tx_hash: txHash })
          .in('id', batchIds)

      } catch (batchErr) {
        console.error(`[Blockchain] Batch minting failed for indexes ${i} to ${i + batch.length - 1}:`, batchErr)
        // Continue to the next batch so that a single failed transaction does not block other distributions
      }
    }

  } catch (err) {
    console.error('[Blockchain] Claim stub minting setup failed:', err)
  }
}

export async function fetchClaimStubs() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('claim_stubs')
    .select('id, beneficiary_uuid, disaster_event_id, aid_type, agency, approved_by, claimed, claimed_by, claimed_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Fetch stubs error:', error)
    return { status: 'error', stubs: [], message: error.message }
  }

  // Map DB column name (beneficiary_uuid) to UI field name (beneficiary_id)
  const mapped = (data ?? []).map((row) => ({
    id: row.id,
    beneficiary_id: row.beneficiary_uuid,
    disaster_event_id: row.disaster_event_id,
    aid_type: row.aid_type,
    agency: row.agency,
    approved_by: row.approved_by,
    claimed: row.claimed,
    claimed_by: row.claimed_by,
    claimed_at: row.claimed_at,
    created_at: row.created_at,
  }))

  return { status: 'success', stubs: mapped }
}
