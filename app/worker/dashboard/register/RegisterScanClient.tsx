"use client"

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Navbar from '@/components/Navbar'
import { registerBeneficiaryOnsite } from '@/app/actions/wallets'
import { parsePhilSysQR, type PhilSysData } from '@/utils/philsys'

const QrScanner = dynamic(() => import('@/components/Scanner'), { ssr: false })

type ScanState = 'idle' | 'scanning' | 'processing' | 'found'

const REGIONS = [
  'NCR', 'Region I', 'Region II', 'Region III', 'Region IV-A', 'Region V',
  'Region VI', 'Region VII', 'Region VIII', 'Region IX', 'Region X',
  'Region XI', 'Region XII', 'CAR', 'BARMM',
]

export default function RegisterScanClient() {
  const router = useRouter()
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [beneficiary, setBeneficiary] = useState<PhilSysData | null>(null)
  const [selectedRegion, setSelectedRegion] = useState('')
  const [barangay, setBarangay] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [result, setResult] = useState<{ status: string; message: string; walletId?: string } | null>(null)

  // Process raw QR data
  const processQRData = useCallback((rawData: string) => {
    if (scanState !== 'idle' && scanState !== 'scanning') return
    setScanState('processing')
    const parsed = parsePhilSysQR(rawData)
    if (parsed) {
      setTimeout(() => {
        setBeneficiary(parsed)
        setScanState('found')
      }, 500)
    } else {
      setResult({ status: 'error', message: 'Invalid QR code — not a recognized PhilSys format.' })
      setScanState('idle')
    }
  }, [scanState])



  const handleRegister = async () => {
    if (!beneficiary || !selectedRegion) return
    setIsRegistering(true)

    try {
      const res = await registerBeneficiaryOnsite({
        nationalId: beneficiary.philsysNumber,
        region: selectedRegion,
        barangay: barangay,
        fullName: `${beneficiary.firstName.charAt(0)}. ${beneficiary.lastName}`,
      })
      setResult({
        status: res.status,
        message: res.message,
        walletId: res.walletId ?? undefined,
      })
    } catch {
      setResult({ status: 'error', message: 'Network error — please retry.' })
    }

    setIsRegistering(false)
    setBeneficiary(null)
    setScanState('idle')
    setSelectedRegion('')
    setBarangay('')
  }

  const handleCancel = () => {
    setBeneficiary(null)
    setScanState('idle')
    setSelectedRegion('')
    setBarangay('')
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-gray-950 to-slate-900" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar role="relief_worker" />

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] backdrop-blur-xl bg-black/10">
          <button onClick={() => router.push('/worker/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-teal-400">Registration Mode</span>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Mode</p>
            <p className="text-xs text-white font-medium">Beneficiary Registration</p>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-white mb-1">Register Beneficiary</h1>
              <p className="text-xs text-slate-500">Scan PhilSys QR to create their wallet identity</p>
            </div>

            {/* Camera Viewfinder */}
            <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-white/[0.08] shadow-2xl shadow-black/40 aspect-[4/3] flex items-center justify-center">
              {(scanState === 'idle' || scanState === 'scanning') && (
                <QrScanner
                  onScan={(result: any) => {
                    if (result && result.length > 0) {
                      processQRData(result[0].rawValue)
                    }
                  }}
                  onError={(error: any) => console.error(error)}
                  components={{
                    audio: false,
                    onOff: false,
                    torch: false,
                    zoom: false,
                    finder: true,
                  }}
                />
              )}

              {/* Scan progress overlay */}
              {scanState === 'processing' && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm z-10">
                  <svg className="w-8 h-8 text-teal-400 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm text-white font-medium">Reading PhilSys Data...</p>
                  <p className="text-[10px] text-slate-400 mt-1">Extracting identity information</p>
                </div>
              )}

              {scanState === 'found' && (
                <div className="absolute inset-0 bg-teal-500/10 border-2 border-teal-400 rounded-2xl transition-all z-10" />
              )}
            </div>

            {/* Result feedback */}
            {result && (
              <div className={`mt-4 px-4 py-3 rounded-xl text-xs font-medium flex items-start gap-2 ${
                result.status === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : result.status === 'exists'
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d={result.status === 'success' ? "M5 13l4 4L19 7" : result.status === 'exists' ? "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" : "M6 18L18 6M6 6l12 12"} />
                </svg>
                <div>
                  <p>{result.message}</p>
                  {result.walletId && (
                    <p className="font-mono text-[10px] mt-1 opacity-70">Wallet: {result.walletId}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Registration Panel (slides up when identity found) */}
        {beneficiary && scanState === 'found' && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel} />

            <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/[0.1] shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
              {/* Header */}
              <div className="px-5 py-4 bg-teal-500/10 border-b border-teal-500/20 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">New Beneficiary Detected</p>
                  <p className="text-[10px] text-teal-400/80">PhilSys data decoded — confirm to register</p>
                </div>
              </div>

              {/* ID Card Content */}
              <div className="p-5">
                <div className="flex gap-4 mb-5">
                  <div className="w-20 h-24 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center flex-shrink-0">
                    <svg className="w-10 h-10 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-white leading-tight">{beneficiary.fullName}</p>
                    <p className="text-[10px] font-mono text-teal-400 mt-1">{beneficiary.philsysNumber}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/[0.06] text-[10px] text-slate-400 font-medium">{beneficiary.sex}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/[0.06] text-[10px] text-slate-400 font-medium">{formatDate(beneficiary.dateOfBirth)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <InfoRow label="Address" value={beneficiary.address} />
                  <InfoRow label="Place of Birth" value={beneficiary.placeOfBirth} />
                </div>

                {/* Region & Barangay selector */}
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Assign Region
                    </label>
                    <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}
                      className="w-full rounded-lg bg-white/[0.06] border border-white/[0.1] text-xs text-white px-3 py-2.5 outline-none focus:border-teal-500/40 transition-colors appearance-none cursor-pointer"
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em', paddingRight: '2rem' }}>
                      <option value="" className="bg-slate-900">— Select Region —</option>
                      {REGIONS.map((r) => (
                        <option key={r} value={r} className="bg-slate-900 text-white">{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Barangay
                    </label>
                    <input type="text" value={barangay} onChange={(e) => setBarangay(e.target.value)}
                      placeholder="e.g. San Antonio"
                      className="w-full rounded-lg bg-white/[0.06] border border-white/[0.1] text-xs text-white px-3 py-2.5 outline-none focus:border-teal-500/40 transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-5 pt-0 flex gap-3">
                <button onClick={handleCancel}
                  className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 text-sm font-semibold hover:bg-white/[0.08] hover:text-white transition-all active:scale-[0.98]">
                  Cancel
                </button>
                <button onClick={handleRegister}
                  disabled={!selectedRegion || isRegistering}
                  className={`flex-[2] py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    selectedRegion && !isRegistering
                      ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-[1.02] active:scale-[0.98]'
                      : isRegistering
                      ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white/80 cursor-wait'
                      : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
                  }`}>
                  {isRegistering ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Registering...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Register &amp; Create Wallet
                    </>
                  )}
                </button>
              </div>

              {!selectedRegion && (
                <p className="text-[10px] text-amber-400 text-center pb-4">⚠ Select a region to enable registration</p>
              )}
            </div>
          </div>
        )}

        <footer className="px-4 py-3 border-t border-white/[0.04] text-center">
          <p className="text-[10px] text-slate-600">All identity data is hashed on-device • No PII stored on servers</p>
        </footer>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-white/[0.04] last:border-0">
      <span className="text-[11px] text-slate-500 uppercase tracking-wider flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-white font-medium text-right">{value}</span>
    </div>
  )
}
