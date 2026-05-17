'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * CLAIM STUBS — Admin creates stubs for eligible beneficiaries.
 * Each stub = one "token" that a worker can redeem at a distribution point.
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

  revalidatePath('/admin/dashboard')
  return {
    status: 'success',
    message: `Created ${data?.length ?? 0} claim stub(s) via ${agency}. Beneficiaries can now receive ${payload.aidType} at distribution points.`,
    count: data?.length ?? 0,
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

  return { status: 'success', stubs: data ?? [] }
}
