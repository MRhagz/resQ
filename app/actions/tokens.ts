'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * =============================================================================
 * TOKEN DISTRIBUTION SERVER ACTION — Off-Chain Ruling to Supabase
 * =============================================================================
 *
 * Records distribution rulings (approvals) to the `token_rulings` table.
 * Each ruling is an auditable record: who approved, for what disaster,
 * what aid type, to which beneficiary, under what eligibility criteria.
 *
 * Agency is auto-populated from the admin's staff_profiles.agency column —
 * the client does NOT send agency; it's resolved server-side.
 */

interface RulingPayload {
  beneficiaryIds: string[]
  disasterEventId: string
  aidType: string
  eligibilityCriteria: {
    region: string
    is_disaster_affected: string
  }
}

export async function recordRulings(payload: RulingPayload) {
  const supabase = await createClient()

  // 1. Verify the user is authenticated and is a super_admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { status: 'error', message: 'Unauthorized — not logged in.' }
  }

  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('role, agency')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'super_admin') {
    return { status: 'error', message: 'Forbidden — only admins can record rulings.' }
  }

  // Agency is auto-resolved from the admin's profile
  const agency = profile.agency
  if (!agency) {
    return { status: 'error', message: 'Your profile has no agency assigned. Contact system administrator.' }
  }

  // 2. Validate payload
  if (!payload.beneficiaryIds.length) {
    return { status: 'error', message: 'No beneficiaries selected.' }
  }
  if (!payload.disasterEventId || !payload.aidType) {
    return { status: 'error', message: 'Disaster event and aid type are required.' }
  }

  // 3. Build ruling rows — agency comes from the admin's profile, not the client
  const rulingRows = payload.beneficiaryIds.map((beneficiaryId) => ({
    admin_id: user.id,
    disaster_event_id: payload.disasterEventId,
    aid_type: payload.aidType,
    agency: agency,
    beneficiary_id: beneficiaryId,
    eligibility_criteria: payload.eligibilityCriteria,
    ruling_status: 'APPROVED',
  }))

  // 4. Batch insert rulings
  const { data, error } = await supabase
    .from('token_rulings')
    .insert(rulingRows)
    .select('id, beneficiary_id, ruling_status')

  if (error) {
    console.error('Ruling insert error:', error)
    if (error.code === '23505') {
      return {
        status: 'error',
        message: 'Some beneficiaries already have an active ruling for this disaster/aid combination.',
      }
    }
    return { status: 'error', message: error.message }
  }

  // 5. Revalidate the dashboard
  revalidatePath('/admin/dashboard')

  return {
    status: 'success',
    message: `Successfully recorded ${data?.length ?? 0} distribution ruling(s) via ${agency}.`,
    rulingCount: data?.length ?? 0,
  }
}

/**
 * Fetch ruling history for the dashboard display.
 * Returns the most recent 50 rulings with disaster event info.
 */
export async function fetchRulings() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('token_rulings')
    .select(`
      id,
      admin_id,
      disaster_event_id,
      aid_type,
      agency,
      beneficiary_id,
      eligibility_criteria,
      ruling_status,
      ruled_at,
      distributed_at
    `)
    .order('ruled_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Fetch rulings error:', error)
    return { status: 'error', rulings: [], message: error.message }
  }

  return { status: 'success', rulings: data ?? [] }
}

/**
 * Update a ruling's status (e.g. APPROVED → DISTRIBUTED or REVOKED)
 */
export async function updateRulingStatus(rulingId: string, newStatus: 'DISTRIBUTED' | 'REVOKED') {
  const supabase = await createClient()

  const updateData: Record<string, unknown> = { ruling_status: newStatus }
  if (newStatus === 'DISTRIBUTED') {
    updateData.distributed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('token_rulings')
    .update(updateData)
    .eq('id', rulingId)

  if (error) {
    console.error('Update ruling error:', error)
    return { status: 'error', message: error.message }
  }

  revalidatePath('/admin/dashboard')
  return { status: 'success', message: `Ruling updated to ${newStatus}.` }
}
