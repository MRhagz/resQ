import { Suspense } from 'react'
import QRScanClient from './QRScanClient'

export default function ScanPage() {
  return (
    <Suspense>
      <QRScanClient />
    </Suspense>
  )
}
