import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import CreateDisasterForm from './CreateDisasterForm'
import { closeDisasterEvent } from '../../actions/admin'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // 1. Enforce Authentication & Authorization
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('staff_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') {
    redirect('/worker/dashboard') // Redirect non-admins
  }

  // 2. Fetch existing disasters
  const { data: disasters } = await supabase
    .from('disaster_events')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column: Create Form */}
          <div className="md:col-span-1">
            <CreateDisasterForm />
          </div>

          {/* Right Column: Active Disasters Ledger */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4 border-b pb-2">Disaster Events Ledger</h2>

              {(!disasters || disasters.length === 0) ? (
                <p className="text-gray-500 italic">No disaster events created yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="p-3 text-sm font-semibold text-gray-600">Code</th>
                        <th className="p-3 text-sm font-semibold text-gray-600">Name</th>
                        <th className="p-3 text-sm font-semibold text-gray-600">Status</th>
                        <th className="p-3 text-sm font-semibold text-gray-600">Regions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {disasters.map((d: any) => (
                        <tr key={d.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-mono text-sm text-blue-600">{d.system_code}</td>
                          <td className="p-3 font-medium">{d.name}</td>
                          <td className="p-3 flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${d.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-800'
                              }`}>
                              {d.status}
                            </span>
                            {d.status === 'ACTIVE' && (
                              <form action={closeDisasterEvent}>
                                <input type="hidden" name="id" value={d.id} />
                                <button type="submit" className="text-red-600 hover:text-red-800 text-xs font-semibold underline">Close</button>
                              </form>
                            )}
                          </td>
                          <td className="p-3 text-sm text-gray-600">
                            {Array.isArray(d.allowed_regions) ? d.allowed_regions.join(', ') : d.allowed_regions}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
