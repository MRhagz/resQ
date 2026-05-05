'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createDisasterEvent(prevState: any, formData: FormData) {
  const name = formData.get('name') as string
  const region = formData.get('region') as string

  if (!name || !region) {
    return { status: 'error', message: 'All fields are required.' }
  }

  const prefix = name.substring(0, 2).toUpperCase() || 'EV'
  const year = new Date().getFullYear()

  const supabase = await createClient()

  // Get sequential number based on events created this year
  const { count, error: countError } = await supabase
    .from('disaster_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01T00:00:00Z`)
    .lt('created_at', `${year + 1}-01-01T00:00:00Z`)

  const seq = countError ? 1 : (count || 0) + 1
  const seqStr = seq.toString().padStart(3, '0')
  const system_code = `${prefix}-${year}-${seqStr}`

  // Allowed regions is expected to be JSONB, so we wrap it in an array
  const { error } = await supabase.from('disaster_events').insert({
    name,
    system_code,
    allowed_regions: [region],
    status: 'ACTIVE'
  })

  if (error) {
    console.error('Create Disaster Error:', error)
    if (error.code === '23505') {
      return { status: 'error', message: 'System Code must be unique.' }
    }
    return { status: 'error', message: error.message }
  }

  // Revalidate the dashboard so the new disaster shows up instantly
  revalidatePath('/admin/dashboard')
  
  return { status: 'success', message: `Successfully created ${name}!` }
}

export async function closeDisasterEvent(formData: FormData) {
  const id = formData.get('id') as string
  if (!id) return

  const supabase = await createClient()
  
  const { error } = await supabase
    .from('disaster_events')
    .update({ status: 'CLOSED' })
    .eq('id', id)

  if (error) {
    console.error('Failed to close disaster:', error)
    return
  }

  revalidatePath('/admin/dashboard')
}
