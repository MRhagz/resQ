"use client"

import { useActionState, useState } from 'react'
import { distributeAid } from '../../actions/worker'
import { Scanner } from '@yudiel/react-qr-scanner'

export default function WorkerDashboardClient({ disasters }: { disasters: any[] }) {
  const [state, formAction, isPending] = useActionState(distributeAid, null)
  const [scannedHash, setScannedHash] = useState('')
  const [isScanning, setIsScanning] = useState(false)

  const handleScan = (detectedCodes: any[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const value = detectedCodes[0].rawValue;
      console.log('Scanned QR:', value);
      setScannedHash(value);
      setIsScanning(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <form action={formAction} className="flex flex-col gap-6">

        {/* Session Lock-in */}
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
          <h2 className="text-lg font-bold text-blue-900 mb-4">1. Lock In Session</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Active Disaster Event</label>
              <select name="disaster_id" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white">
                <option value="">Select an Event...</option>
                {disasters.map(d => (
                  <option key={d.id} value={d.id}>{d.system_code} - {d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Aid Type</label>
              <select name="aid_type" required className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-white">
                <option value="Food Ration">Food Ration</option>
                <option value="Medical Kit">Medical Kit</option>
                <option value="Cash Assistance">Cash Assistance</option>
              </select>
            </div>
          </div>
        </div>

        {/* High-Speed Claiming */}
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">2. High-Speed Claiming</h2>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700">Scanned Beneficiary ID Hash</label>
              <input
                type="text"
                name="beneficiary_hash"
                value={scannedHash}
                onChange={(e) => setScannedHash(e.target.value)}
                placeholder="Scan PhilSys QR..."
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 font-mono bg-white"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsScanning(!isScanning)}
              className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 font-bold"
            >
              {isScanning ? 'Stop Scanner' : 'Scan QR Code'}
            </button>
          </div>

          {isScanning && (
            <div className="mt-4 border rounded-md overflow-hidden bg-black max-w-sm mx-auto">
              <Scanner
                onScan={handleScan}
                onError={(error) => console.error(error)}
              />
            </div>
          )}
        </div>

        {/* Physical Verification & Submit */}
        <button
          type="submit"
          disabled={isPending || !scannedHash}
          className="w-full bg-blue-600 text-white rounded-md py-4 text-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Processing Ledger Transaction...' : 'Confirm Identity & Distribute Aid'}
        </button>

        {/* High Contrast Real-Time Feedback */}
        {state?.message && (
          <div className={`p-4 rounded-md text-lg font-bold text-center border-4 ${state.status === 'success'
            ? 'bg-green-50 text-green-450 border-green-250'
            : 'bg-red-300 text-white border-red-400'
            }`}>
            {state.message}
          </div>
        )}
      </form>
    </div>
  )
}
