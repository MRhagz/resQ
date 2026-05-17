import AdminDashboardClient from './AdminDashboardClient'
import { fetchDisasters, fetchBeneficiaries } from '@/app/actions/data'
import { fetchClaimStubs } from '@/app/actions/tokens'

export default async function AdminDashboard() {
  const [disasters, beneficiaries, stubsResult] = await Promise.all([
    fetchDisasters(),
    fetchBeneficiaries(),
    fetchClaimStubs(),
  ])

  const stubs = stubsResult.stubs ?? []

  return (
    <AdminDashboardClient
      disasters={disasters}
      beneficiaries={beneficiaries}
      claimStubs={stubs}
    />
  )
}
