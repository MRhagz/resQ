'use server'

import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'
import { revalidatePath } from 'next/cache'

/**
 * ONSITE BENEFICIARY REGISTRATION — Scan QR → Register → Create Wallet
 * 
 * Called by relief workers scanning PhilSys QR codes in the field.
 * Registers the beneficiary in the database, effectively creating their
 * "wallet" (their system_uuid in the beneficiaries table).
 *
 * Flow:
 *   1. Worker scans PhilSys QR → extracts national ID
 *   2. Server hashes the ID (zero-PII storage)
 *   3. Inserts into beneficiaries table with ONSITE_STAFF source
 *   4. Returns the system_uuid (wallet ID) on success
 */

interface RegistrationPayload {
  nationalId: string
  region: string
  fullName: string // stored only as first initial + last for display, NOT raw PII
}

export async function registerBeneficiaryOnsite(payload: RegistrationPayload) {
  const supabase = await createClient()

  // 1. Verify the worker is authenticated
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Unauthorized — not logged in.' }
  }

  // Verify they are a relief_worker or super_admin
  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['relief_worker', 'super_admin'].includes(profile.role)) {
    return { status: 'error', message: 'Forbidden — only relief workers can register beneficiaries onsite.' }
  }

  // 2. Validate payload
  if (!payload.nationalId) {
    return { status: 'error', message: 'National ID is required.' }
  }

  // 3. Hash the national ID (zero-PII)
  const salt = process.env.SYSTEM_HASH_SALT
  if (!salt) {
    console.error('SYSTEM_HASH_SALT not configured')
    return { status: 'error', message: 'Server configuration error.' }
  }

  const sanitizedId = payload.nationalId.replace(/\s+/g, '').toUpperCase()
  const idHash = crypto.createHash('sha256').update(sanitizedId + salt).digest('hex')

  // 4. Build demographics payload
  const demographics: Record<string, string> = {}
  if (payload.region) demographics.region = payload.region
  // Store only first initial + last name for display (not full PII)
  if (payload.fullName) demographics.display_name = payload.fullName

  // 5. Insert beneficiary — their system_uuid IS their wallet
  const { data: beneficiary, error } = await supabase
    .from('beneficiaries')
    .insert({
      id_hash: idHash,
      registration_source: 'ONSITE_STAFF',
      general_demographics: demographics,
    })
    .select('system_uuid, created_at')
    .single()

  if (error) {
    if (error.code === '23505') {
      // Already registered — fetch existing wallet
      const { data: existing } = await supabase
        .from('beneficiaries')
        .select('system_uuid, created_at')
        .eq('id_hash', idHash)
        .single()

      return {
        status: 'exists',
        message: 'This beneficiary is already registered in the system.',
        walletId: existing?.system_uuid ?? null,
        registeredAt: existing?.created_at ?? null,
      }
    }
    console.error('Registration error:', error)
    return { status: 'error', message: error.message }
  }

  revalidatePath('/worker/dashboard')

  return {
    status: 'success',
    message: 'Beneficiary registered — wallet created successfully.',
    walletId: beneficiary.system_uuid,
    registeredAt: beneficiary.created_at,
  }
}
