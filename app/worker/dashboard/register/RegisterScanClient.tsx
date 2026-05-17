"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { registerBeneficiaryOnsite } from '@/app/actions/wallets'

type ScanState = 'idle' | 'scanning' | 'processing' | 'found'

interface BeneficiaryInfo {
  fullName: string
  firstName: string
  middleName: string
  lastName: string
  suffix: string
  sex: string
  dateOfBirth: string
  placeOfBirth: string
  address: string
  philsysNumber: string
}

// Mock data — simulates PhilSys QR decode
const MOCK_BENEFICIARIES: BeneficiaryInfo[] = [
  {
    fullName: 'MARIA CLARA SANTOS',
    firstName: 'MARIA CLARA',
    middleName: 'REYES',
    lastName: 'SANTOS',
    suffix: '',
    sex: 'Female',
    dateOfBirth: '1990-07-22',
    placeOfBirth: 'Quezon City, Metro Manila',
    address: 'Brgy. Commonwealth, Quezon City',
    philsysNumber: 'PSN-XXXX-XXXX-5678',
  },
  {
    fullName: 'PEDRO GARCIA MENDOZA',
    firstName: 'PEDRO',
    middleName: 'GARCIA',
    lastName: 'MENDOZA',
    suffix: '',
    sex: 'Male',
    dateOfBirth: '1978-11-03',
    placeOfBirth: 'Davao City, Davao del Sur',
    address: 'Brgy. Buhangin, Davao City',
    philsysNumber: 'PSN-XXXX-XXXX-9012',
  },
  {
    fullName: 'ROSALINDA VILLANUEVA CRUZ',
    firstName: 'ROSALINDA',
    middleName: 'VILLANUEVA',
    lastName: 'CRUZ',
    suffix: '',
    sex: 'Female',
    dateOfBirth: '1965-02-14',
    placeOfBirth: 'Legazpi City, Albay',
    address: 'Brgy. Daraga, Albay',
    philsysNumber: 'PSN-XXXX-XXXX-3456',
  },
]

const REGIONS = [
  'NCR', 'Region I', 'Region II', 'Region III', 'Region IV-A', 'Region V',
  'Region VI', 'Region VII', 'Region VIII', 'Region IX', 'Region X',
  'Region XI', 'Region XII', 'CAR', 'BARMM',
]

export default function RegisterScanClient() {
  const router = useRouter()
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [beneficiary, setBeneficiary] = useState<BeneficiaryInfo | null>(null)
  const [scanProgress, setScanProgress] = useState(0)
  const [selectedRegion, setSelectedRegion] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const [result, setResult] = useState<{ status: string; message: string; walletId?: string } | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const mockIndexRef = useRef(0)

  useEffect(() => {
    let stream: MediaStream | null = null
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          setCameraActive(true)
        }
      } catch {
        setCameraError('Camera access denied or unavailable')
        setCameraActive(false)
      }
    }
    startCamera()
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()) }
  }, [])

  const handleSimulateScan = async () => {
    setScanState('scanning')
    setScanProgress(0)
    setResult(null)
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 40))
      setScanProgress(i)
    }
    setScanState('processing')
    await new Promise(r => setTimeout(r, 1000))
    const mock = MOCK_BENEFICIARIES[mockIndexRef.current % MOCK_BENEFICIARIES.length]
    mockIndexRef.current++
    setBeneficiary(mock)
    setScanState('found')
  }

  const handleRegister = async () => {
    if (!beneficiary || !selectedRegion) return
    setIsRegistering(true)

    try {
      const res = await registerBeneficiaryOnsite({
        nationalId: beneficiary.philsysNumber,
        region: selectedRegion,
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
    setScanProgress(0)
    setSelectedRegion('')
  }

  const handleCancel = () => {
    setBeneficiary(null)
    setScanState('idle')
    setScanProgress(0)
    setSelectedRegion('')
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
            <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-white/[0.08] shadow-2xl shadow-black/40 aspect-[4/3]">
              <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-slate-400">
                  <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-center px-8">{cameraError}</p>
                  <p className="text-[10px] text-slate-600 mt-1">Use the button below to simulate a scan</p>
                </div>
              )}

              {!cameraActive && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-6 h-6 text-teal-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-xs text-slate-500">Initializing camera...</p>
                  </div>
                </div>
              )}

              {/* Scan frame — teal accent for registration */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 relative">
                  <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-teal-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-teal-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-teal-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-teal-400 rounded-br-lg" />
                  {scanState === 'scanning' && (
                    <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-lg shadow-teal-400/50"
                      style={{ top: `${scanProgress}%`, transition: 'top 40ms linear' }} />
                  )}
                </div>
              </div>

              {scanState === 'processing' && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                  <svg className="w-8 h-8 text-teal-400 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm text-white font-medium">Reading PhilSys Data...</p>
                  <p className="text-[10px] text-slate-400 mt-1">Extracting identity information</p>
                </div>
              )}

              {scanState === 'found' && (
                <div className="absolute inset-0 bg-teal-500/10 border-2 border-teal-400 rounded-2xl transition-all" />
              )}
            </div>

            {/* Scan button */}
            {scanState === 'idle' && (
              <button onClick={handleSimulateScan}
                className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-sm font-bold tracking-wide uppercase shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Simulate QR Scan
              </button>
            )}

            {scanState === 'scanning' && (
              <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
                <svg className="w-4 h-4 text-teal-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-medium text-teal-300">Scanning QR Code...</p>
                  <div className="w-full h-1 bg-teal-500/20 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-teal-400 rounded-full transition-all duration-100 ease-linear"
                      style={{ width: `${scanProgress}%` }} />
                  </div>
                </div>
              </div>
            )}

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

                {/* Region selector */}
                <div className="mb-4">
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
