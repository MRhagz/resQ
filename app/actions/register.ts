'use server'

import { createClient } from '@/utils/supabase/server'
import crypto from 'crypto'

export async function registerBeneficiary(prevState: any, formData: FormData) {
  const rawId = formData.get('national_id') as string
  const source = formData.get('source') as string // 'WEB_PUBLIC' or 'ONSITE_STAFF'
  const region = formData.get('region') as string

  if (!rawId) {
    return { status: 'error', message: 'ID is required.' }
  }

  // 1. Sanitize and Hash
  const salt = process.env.SYSTEM_HASH_SALT!
  const sanitizedId = rawId.replace(/\s+/g, '').toUpperCase()
  const hash = crypto.createHash('sha256').update(sanitizedId + salt).digest('hex')

  // 2. Format the demographics payload
  const demographics = region ? { region } : {}

  // 3. Save to Database
  const supabase = await createClient()
  const { error } = await supabase
    .from('beneficiaries')
    .insert([{
      id_hash: hash,
      registration_source: source,
      general_demographics: demographics
    }])

  if (error) {
    if (error.code === '23505') {
      return { status: 'error', message: 'This ID is already registered in the system.' }
    }
    console.error('Registration Error:', error)
    return { status: 'error', message: 'A database error occurred.' }
  }

  return { status: 'success', message: 'Digital Identity created successfully.' }
}