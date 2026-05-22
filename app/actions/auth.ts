'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { processWorkerBlockchainIntegration } from '@/lib/blockchain/workerIntegration.js'

export async function login(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { status: 'error', message: error.message }
  }

  // After login, we redirect to a common dashboard or check role
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase.from('staff_profiles').select('role').eq('id', user.id).single()
    if (profile?.role === 'super_admin') {
      redirect('/admin/dashboard')
    } else {
      redirect('/worker/dashboard')
    }
  }

  redirect('/')
}

export async function signup(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = formData.get('role') as string
  const agency = formData.get('agency') as string | null

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { status: 'error', message: error.message }
  }

  if (data.user) {
    const profileData: Record<string, unknown> = {
      id: data.user.id,
      role: role,
    }

    // Only super_admins have an agency
    if (role === 'super_admin' && agency) {
      profileData.agency = agency
    }

    const { data: profileResult, error: profileError } = await supabase
      .from('staff_profiles')
      .insert(profileData)
      .select('wallet_index')
      .single()

    if (profileError) {
      console.error('Profile Creation Error:', profileError)
      return {
        status: 'error',
        message: 'User created, but failed to create staff profile. Check RLS policies: ' + profileError.message
      }
    }

    if (profileResult?.wallet_index) {
      // Fire-and-forget: Create wallet and mint Identity NFT in the background
      processWorkerBlockchainIntegration(data.user.id, profileResult.wallet_index)
        .catch(err => console.error("Background worker integration error:", err))
    }
  }

  return { status: 'success', message: 'Account created! You can now log in.' }
}
