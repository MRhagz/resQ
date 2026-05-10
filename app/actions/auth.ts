'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

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
  const role = formData.get('role') as string // 'super_admin' or 'relief_worker'
  
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { status: 'error', message: error.message }
  }

  if (data.user) {
    // Attempt to insert into staff_profiles. 
    // Note: If RLS is enabled and blocking this, it will fail unless policies allow it.
    const { error: profileError } = await supabase.from('staff_profiles').insert({
      id: data.user.id,
      role: role
    })

    if (profileError) {
      console.error('Profile Creation Error:', profileError)
      return { 
        status: 'error', 
        message: 'User created, but failed to create staff profile. Check RLS policies: ' + profileError.message 
      }
    }
  }

  return { status: 'success', message: 'Account created! You can now log in.' }
}
