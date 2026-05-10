"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

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
  photo: string | null
}

const MOCK_BENEFICIARY: BeneficiaryInfo = {
  fullName: 'JUAN ANDRES DELA CRUZ',
  firstName: 'JUAN ANDRES',
  middleName: 'SANTOS',
  lastName: 'DELA CRUZ',
  suffix: '',
  sex: 'Male',
  dateOfBirth: '1985-03-15',
  placeOfBirth: 'Manila, Metro Manila',
  address: 'Brgy. San Antonio, Cainta, Rizal',
  philsysNumber: 'PSN-XXXX-XXXX-1234',
  photo: null,
}

export default function QRScanClient() {
  const router = useRouter()
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [beneficiary, setBeneficiary] = useState<BeneficiaryInfo | null>(null)
  const [scanProgress, setScanProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState('')

  // Start camera
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

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  const handleSimulateScan = async () => {
    setScanState('scanning')
    setScanProgress(0)

    // Animate scanning progress
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 40))
      setScanProgress(i)
    }

    setScanState('processing')
    await new Promise(r => setTimeout(r, 1000))

    setBeneficiary(MOCK_BENEFICIARY)
    setScanState('found')
  }

  const handleConfirm = () => {
    // In a real app, this would submit the distribution
    alert('Aid distribution confirmed! (Frontend only — no backend connected)')
    setBeneficiary(null)
    setScanState('idle')
    setScanProgress(0)
  }

  const handleReject = () => {
    setBeneficiary(null)
    setScanState('idle')
    setScanProgress(0)
  }

  const handleBack = () => {
    router.push('/worker/dashboard')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-gray-950 to-slate-900" />

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] backdrop-blur-xl bg-black/20">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-emerald-400">Session Active</span>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Distributing</p>
            <p className="text-xs text-white font-medium">Food Ration</p>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {/* Scanner Card */}
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <h1 className="text-xl font-bold text-white mb-1">Scan National ID</h1>
              <p className="text-xs text-slate-500">Point camera at beneficiary&apos;s PhilSys QR code</p>
            </div>

            {/* Camera Viewfinder */}
            <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-white/[0.08] shadow-2xl shadow-black/40 aspect-[4/3]">
              {/* Video feed */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Camera error fallback */}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-slate-400">
                  <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-xs text-center px-8">{cameraError}</p>
                  <p className="text-[10px] text-slate-600 mt-1">Use the button below to simulate a scan</p>
                </div>
              )}

              {/* Camera not active placeholder */}
              {!cameraActive && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-6 h-6 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <p className="text-xs text-slate-500">Initializing camera...</p>
                  </div>
                </div>
              )}

              {/* Scan frame overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                {/* Corner brackets */}
                <div className="w-56 h-56 relative">
                  {/* Top-left */}
                  <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-blue-400 rounded-tl-lg" />
                  {/* Top-right */}
                  <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-blue-400 rounded-tr-lg" />
                  {/* Bottom-left */}
                  <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-blue-400 rounded-bl-lg" />
                  {/* Bottom-right */}
                  <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-blue-400 rounded-br-lg" />

                  {/* Scanning line animation */}
                  {scanState === 'scanning' && (
                    <div
                      className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-lg shadow-blue-400/50"
                      style={{
                        top: `${scanProgress}%`,
                        transition: 'top 40ms linear',
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Scan progress overlay */}
              {scanState === 'processing' && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
                  <svg className="w-8 h-8 text-blue-400 animate-spin mb-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-sm text-white font-medium">Processing QR Data...</p>
                  <p className="text-[10px] text-slate-400 mt-1">Decrypting identity hash</p>
                </div>
              )}

              {/* Success flash */}
              {scanState === 'found' && (
                <div className="absolute inset-0 bg-emerald-500/10 border-2 border-emerald-400 rounded-2xl transition-all" />
              )}
            </div>

            {/* Scan button */}
            {scanState === 'idle' && (
              <button
                onClick={handleSimulateScan}
                className="w-full mt-4 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold tracking-wide uppercase shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Simulate QR Scan
              </button>
            )}

            {scanState === 'scanning' && (
              <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <svg className="w-4 h-4 text-blue-400 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <div className="flex-1">
                  <p className="text-xs font-medium text-blue-300">Scanning QR Code...</p>
                  <div className="w-full h-1 bg-blue-500/20 rounded-full mt-1.5 overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full transition-all duration-100 ease-linear"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Beneficiary Info Panel (slides up when found) */}
        {beneficiary && scanState === 'found' && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={handleReject}
            />

            {/* Panel */}
            <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/[0.1] shadow-2xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
              {/* Success header */}
              <div className="px-5 py-4 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">National ID Verified</p>
                  <p className="text-[10px] text-emerald-400/80">PhilSys data decoded successfully</p>
                </div>
              </div>

              {/* ID Card Style Content */}
              <div className="p-5">
                <div className="flex gap-4 mb-5">
                  {/* Avatar placeholder */}
                  <div className="w-20 h-24 rounded-lg bg-white/[0.06] border border-white/[0.1] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    <svg className="w-10 h-10 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>

                  {/* Name & ID */}
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-white leading-tight">{beneficiary.fullName}</p>
                    <p className="text-[10px] font-mono text-blue-400 mt-1">{beneficiary.philsysNumber}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/[0.06] text-[10px] text-slate-400 font-medium">
                        {beneficiary.sex}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-white/[0.06] text-[10px] text-slate-400 font-medium">
                        {formatDate(beneficiary.dateOfBirth)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info grid */}
                <div className="space-y-3">
                  <InfoRow label="First Name" value={beneficiary.firstName} />
                  <InfoRow label="Middle Name" value={beneficiary.middleName} />
                  <InfoRow label="Last Name" value={beneficiary.lastName} />
                  <InfoRow label="Place of Birth" value={beneficiary.placeOfBirth} />
                  <InfoRow label="Address" value={beneficiary.address} />
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-5 pt-0 flex gap-3">
                <button
                  onClick={handleReject}
                  className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 text-sm font-semibold hover:bg-white/[0.08] hover:text-white transition-all active:scale-[0.98]"
                >
                  Reject
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-bold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Confirm &amp; Distribute Aid
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <footer className="px-4 py-3 border-t border-white/[0.04] text-center">
          <p className="text-[10px] text-slate-600">
            All identity data is hashed on-device • No PII stored on servers
          </p>
        </footer>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
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
