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
  const { data: stub, error: findError } = await supabase
    .from('claim_stubs')
    .select('id, claimed')
    .eq('beneficiary_uuid', beneficiaryUuid)
    .eq('disaster_event_id', disasterId)
    .eq('aid_type', aidType)
    .single()

  if (stub) {
    if (stub.claimed) {
      return { status: 'error', message: 'Already claimed! This aid has already been distributed.' }
    }

    // 2. Redeem existing stub
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
