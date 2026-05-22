import { fetchPublicLedger } from '@/app/actions/transparency'
import TransparencyClient from './TransparencyClient'

export default async function TransparencyPortal() {
  const ledgerData = await fetchPublicLedger()
  return <TransparencyClient ledgerData={ledgerData} />
}
