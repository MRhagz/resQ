'use server'

import { createClient } from '@/utils/supabase/server'

export async function distributeAid(prevState: any, formData: FormData) {
  const beneficiaryHash = formData.get('beneficiary_hash') as string
  const disasterId = formData.get('disaster_id') as string // UUID
  const aidType = formData.get('aid_type') as string

  if (!beneficiaryHash || !disasterId || !aidType) {
    return { status: 'error', message: 'All fields are required.' }
  }

  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { status: 'error', message: 'Unauthorized' }

  // For testing purposes: Check if beneficiary exists. If not, auto-register them 
  // since we skipped the actual web-registration step.
  const { data: beneficiary } = await supabase
    .from('beneficiaries')
    .select('system_uuid')
    .eq('id_hash', beneficiaryHash)
    .single()

  let beneficiaryUuid = beneficiary?.system_uuid

  if (!beneficiaryUuid) {
    const { data: newBen, error: insertBenError } = await supabase
      .from('beneficiaries')
      .insert({
        id_hash: beneficiaryHash,
        registration_source: 'TEST_SCAN_UI',
        general_demographics: {}
      })
      .select('system_uuid')
      .single()

    if (insertBenError) {
      console.error('Auto-register failed:', insertBenError)
      return { status: 'error', message: 'Failed to create mock beneficiary.' }
    }
    beneficiaryUuid = newBen.system_uuid
  }

  // Attempt to insert the distribution claim
  const { error: claimError } = await supabase
    .from('claims')
    .insert({
      beneficiary_uuid: beneficiaryUuid,
      disaster_event_id: disasterId,
      aid_type: aidType,
      relief_worker_id: user.id
    })

  if (claimError) {
    console.error('Claim Error:', claimError)
    // 23505 is the PostgreSQL code for unique constraint violations
    if (claimError.code === '23505') {
      return { status: 'error', message: 'Already Claimed!' }
    }
    return { status: 'error', message: claimError.message }
  }

  return { status: 'success', message: 'Aid Successfully Logged to Ledger!' }
}
