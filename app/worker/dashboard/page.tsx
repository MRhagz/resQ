import LockInSessionClient from './LockInSessionClient'
import { fetchDisasters } from '@/app/actions/data'

export default async function WorkerDashboard() {
  const disasters = await fetchDisasters()
  const activeDisasters = disasters.filter((d) => d.status === 'ACTIVE')

  return <LockInSessionClient disasters={activeDisasters} />
}
