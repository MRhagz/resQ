'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

/**
 * Fetch all disaster events from the database.
 */
export async function fetchDisasters() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('disaster_events')
    .select('id, system_code, name, status, allowed_regions, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetch disasters error:', error)
    return []
  }

  return data ?? []
}

/**
 * Fetch all beneficiaries from the database.
 * Maps JSONB demographics to flat fields for the UI.
 */
export async function fetchBeneficiaries() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('beneficiaries')
    .select('system_uuid, id_hash, registration_source, general_demographics, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetch beneficiaries error:', error)
    return []
  }

  // Map DB rows to the shape the UI expects
  return (data ?? []).map((row) => {
    const demo = (row.general_demographics as Record<string, unknown>) ?? {}
    return {
      id: row.system_uuid,
      full_name: (demo.display_name as string) ?? 'Unknown',
      region: (demo.region as string) ?? 'Unknown',
      barangay: (demo.barangay as string) ?? '',
      is_disaster_affected: (demo.is_disaster_affected as boolean) ?? false,
      registration_source: row.registration_source,
      philsys_hash: row.id_hash,
      created_at: row.created_at,
    }
  })
}

/**
 * Create a new disaster event in the database.
 * Forced recompile.
 */

export async function createDisaster(formData: FormData) {
  const name = formData.get('name') as string
  const region = formData.get('region') as string

  if (!name || !region) {
    return { status: 'error', message: 'Name and Region are required.' }
  }

  const prefix = name.substring(0, 2).toUpperCase()
  const code = `${prefix}-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999) + 1).padStart(3, '0')}`

  const supabase = await createClient()

  const { data, error } = await supabase.from('disaster_events').insert({
    system_code: code,
    name: name,
    status: 'ACTIVE',
    allowed_regions: [region],
  }).select()

  if (error) {
    console.error('Create disaster error:', error)
    return { status: 'error', message: 'Failed to create disaster event.' }
  }

  revalidatePath('/admin/dashboard')
  const newDisaster = data?.[0]
  return { status: 'success', message: `Deployed "${name}" as ${code}`, disaster: newDisaster }
}
