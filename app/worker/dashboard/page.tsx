import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import WorkerDashboardClient from './WorkerDashboardClient'

export default async function WorkerDashboard() {
  const supabase = await createClient()

  // 1. Enforce Authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // We could check if they are a relief_worker here, but for testing, 
  // both roles can see the dashboard, or we just allow them through.

  // 2. Fetch ACTIVE disasters
  const { data: disasters } = await supabase
    .from('disaster_events')
    .select('id, name, system_code')
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Relief Worker Dashboard</h1>
        </header>

        <WorkerDashboardClient disasters={disasters || []} />
      </div>
    </main>
  )
}
