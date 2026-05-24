'use server'

import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'

/**
 * DISTRIBUTE AID — Worker scans national ID, system redeems the claim stub.
 *
 * Flow:
 *   1. Worker sends beneficiary hash + locked-in disaster/aid
 *   2. System finds the beneficiary by id_hash
 *   3. System finds an unclaimed stub matching beneficiary + disaster + aid
 *   4. If found → marks claimed=true, records worker + timestamp
 *   5. If not found → rejects (not eligible or already claimed)
 *   6. On-chain: Token burning is deferred to EOD batch reconciliation
 */
export async function distributeAid(prevState: any, formData: FormData) {
  const beneficiaryHash = formData.get('beneficiary_hash') as string
  const disasterId = formData.get('disaster_id') as string
  const aidType = formData.get('aid_type') as string

  if (!beneficiaryHash || !disasterId || !aidType) {
    return { status: 'error', message: 'All fields are required.' }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Unauthorized' }

  // 1. Look up beneficiary by hash
  const salt = process.env.SYSTEM_HASH_SALT
  let lookupHash = beneficiaryHash

  // If the hash doesn't look pre-hashed (mock scenario), hash it
  if (salt && beneficiaryHash.length < 64) {
    const sanitized = beneficiaryHash.replace(/\s+/g, '').toUpperCase()
    lookupHash = crypto.createHash('sha256').update(sanitized + salt).digest('hex')
  }

  const { data: beneficiary } = await supabase
    .from('beneficiaries')
    .select('system_uuid')
    .eq('id_hash', lookupHash)
    .single()

  if (!beneficiary) {
    // Try raw hash as fallback (for mock/test data)
    const { data: fallback } = await supabase
      .from('beneficiaries')
      .select('system_uuid')
      .eq('id_hash', beneficiaryHash)
      .single()

    if (!fallback) {
      return { status: 'error', message: 'Beneficiary not found. They must be registered first.' }
    }
    // Use fallback
    return await redeemStub(supabase, fallback.system_uuid, disasterId, aidType, user.id)
  }

  return await redeemStub(supabase, beneficiary.system_uuid, disasterId, aidType, user.id)
}

async function redeemStub(
  supabase: any,
  beneficiaryUuid: string,
  disasterId: string,
  aidType: string,
  workerId: string
) {
  // 1. Check if a stub already exists
  const { data: stub } = await supabase
    .from('claim_stubs')
    .select('id, claimed, mint_tx_hash')
    .eq('beneficiary_uuid', beneficiaryUuid)
    .eq('disaster_event_id', disasterId)
    .eq('aid_type', aidType)
    .single()

  if (stub) {
    if (stub.claimed) {
      return { status: 'error', message: 'Already claimed! This aid has already been distributed.' }
    }

    // 2. Redeem existing stub — DB is the source of truth
    const { error: updateError } = await supabase
      .from('claim_stubs')
      .update({
        claimed: true,
        claimed_by: workerId,
        claimed_at: new Date().toISOString(),
      })
      .eq('id', stub.id)
      .eq('claimed', false)

    if (updateError) {
      console.error('Redeem error:', updateError)
      return { status: 'error', message: 'Failed to redeem stub.' }
    }

  } else {
    return {
      status: 'error',
      message: 'No claim stub found — this beneficiary is not eligible for this aid type in this disaster.',
    }
  }

  return { status: 'success', message: 'Aid successfully distributed! Claim stub redeemed.' }
}

/**
 * END SESSION — Burns all claimed-but-unburned stubs for this worker today.
 *
 * Called when the relief worker ends their distribution session.
 * Each stub is burned individually via multi-sig (admin + worker + beneficiary).
 */
export async function endSession(disasterId: string, aidType: string) {
  if (!disasterId || !aidType) {
    return { burned: 0, total: 0, errors: ['Missing disasterId or aidType.'] }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { burned: 0, total: 0, errors: ['Unauthorized'] }

  // Start of today in UTC
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  // 1. Fetch claimed stubs pending burn for this worker, disaster, and aid type today
  const { data: pendingStubs, error } = await supabase
    .from('claim_stubs')
    .select('id, beneficiary_uuid, disaster_event_id, aid_type, agency, approved_by')
    .eq('claimed_by', user.id)
    .eq('disaster_event_id', disasterId)
    .eq('aid_type', aidType)
    .eq('claimed', true)
    .is('burned_at', null)
    .not('mint_tx_hash', 'is', null)
    .gte('claimed_at', todayStart.toISOString())

  if (error) {
    console.error('[EndSession] Failed to fetch pending stubs:', error)
    return { burned: 0, total: 0, errors: [error.message] }
  }

  if (!pendingStubs || pendingStubs.length === 0) {
    return { burned: 0, total: 0, errors: [] }
  }

  // 2. Fetch disaster details (system_code + campaign dates for time-lock policy)
  const { data: disaster } = await supabase
    .from('disaster_events')
    .select('system_code, starts_at, ends_at')
    .eq('id', disasterId)
    .single()

  if (!disaster) {
    return { burned: 0, total: pendingStubs.length, errors: ['Disaster event not found.'] }
  }

  // 3. Fetch worker's own wallet profile
  const { data: workerProfile } = await supabase
    .from('staff_profiles')
    .select('id, wallet_index, wallet_address')
    .eq('id', user.id)
    .single()

  if (!workerProfile) {
    return { burned: 0, total: pendingStubs.length, errors: ['Worker wallet profile not found.'] }
  }

  // 4. Fetch admin wallet profiles (approved_by)
  const adminIds = [...new Set(pendingStubs.map(s => s.approved_by))]
  const { data: adminsData } = await supabase
    .from('staff_profiles')
    .select('id, wallet_index, wallet_address')
    .in('id', adminIds)
  const adminMap: Record<string, { id: string; wallet_index: number; wallet_address: string }> =
    Object.fromEntries((adminsData || []).map(a => [a.id, a]))

  // 5. Fetch beneficiary wallet profiles
  const beneficiaryUuids = [...new Set(pendingStubs.map(s => s.beneficiary_uuid))]
  const { data: beneficiariesData } = await supabase
    .from('beneficiaries')
    .select('system_uuid, wallet_index, wallet_address')
    .in('system_uuid', beneficiaryUuids)
  const beneficiaryMap: Record<string, { system_uuid: string; wallet_index: number; wallet_address: string }> =
    Object.fromEntries((beneficiariesData || []).map(b => [b.system_uuid, b]))

  // 6. Burn each stub individually via multi-sig
  const { burnIndividualMultiSigStub } = await import('@/lib/blockchain/burnClaimStubs')

  let totalBurned = 0
  const errors: string[] = []

  for (const stub of pendingStubs) {
    const adminProfile = adminMap[stub.approved_by]
    const beneficiaryProfile = beneficiaryMap[stub.beneficiary_uuid]

    if (!adminProfile || !beneficiaryProfile) {
      const missing = []
      if (!adminProfile) missing.push('Admin')
      if (!beneficiaryProfile) missing.push('Beneficiary')
      errors.push(`Stub ${stub.id}: missing ${missing.join(', ')} profile`)
      continue
    }

    const campaign = {
      disasterCode: disaster.system_code,
      aidType: stub.aid_type,
      agency: stub.agency,
      startsAt: disaster.starts_at,
      endsAt: disaster.ends_at,
    }

    try {
      const txHash = await burnIndividualMultiSigStub(campaign, adminProfile, workerProfile, beneficiaryProfile)

      await supabase
        .from('claim_stubs')
        .update({ burn_tx_hash: txHash, burned_at: new Date().toISOString() })
        .eq('id', stub.id)

      totalBurned++
    } catch (err: any) {
      errors.push(`Stub ${stub.id}: ${err.message || err}`)
    }
  }

  return { burned: totalBurned, total: pendingStubs.length, errors }
}
