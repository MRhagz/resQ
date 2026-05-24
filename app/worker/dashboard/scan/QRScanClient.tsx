"use client"

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Navbar from '@/components/Navbar'
import { distributeAid, endSession } from '@/app/actions/worker'
import { parsePhilSysQR, type PhilSysData } from '@/utils/philsys'

const QrScanner = dynamic(() => import('@/components/Scanner'), { ssr: false })

type ScanState = 'idle' | 'scanning' | 'processing' | 'found' | 'confirming' | 'burning' | 'summary'

// Extend PhilSysData with optional photo for display
interface BeneficiaryInfo extends PhilSysData {
  photo: string | null
}

export default function QRScanClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [beneficiary, setBeneficiary] = useState<BeneficiaryInfo | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ status: string; message: string } | null>(null)
  const [burnResult, setBurnResult] = useState<{ burned: number; total: number; errors: string[] } | null>(null)

  // Session params from lock-in
  const sessionDisasterId = searchParams.get('disaster') ?? '1'
  const sessionAidType = searchParams.get('aid') ?? 'Food Ration'

  // Process a raw QR string into beneficiary info
  const processQRData = useCallback((rawData: string) => {
    if (scanState !== 'idle' && scanState !== 'scanning') return
    setScanState('processing')
    const parsed = parsePhilSysQR(rawData)
    if (parsed) {
      setTimeout(() => {
        setBeneficiary({ ...parsed, photo: null })
        setScanState('found')
      }, 500)
    } else {
      setResult({ status: 'error', message: 'Invalid QR code — not a recognized PhilSys format.' })
      setScanState('idle')
    }
  }, [scanState])



  const handleConfirm = async () => {
    if (!beneficiary) return
    setIsSubmitting(true)
    setResult(null)

    // Build FormData for the server action
    const formData = new FormData()
    formData.set('beneficiary_hash', beneficiary.philsysNumber)
    formData.set('disaster_id', sessionDisasterId)
    formData.set('aid_type', sessionAidType)

    const res = await distributeAid(null, formData)
    setResult({ status: res.status, message: res.message })
    setIsSubmitting(false)
    setBeneficiary(null)
    setScanState('idle')
  }

  const handleReject = () => {
    setBeneficiary(null)
    setScanState('idle')
  }

  const handleBack = () => {
    router.push('/worker/dashboard')
  }

  const handleEndSession = () => {
    setScanState('confirming')
  }

  const handleCancelEndSession = () => {
    setScanState('idle')
  }

  const handleConfirmBurn = async () => {
    setScanState('burning')
    const res = await endSession(sessionDisasterId, sessionAidType)
    setBurnResult(res)
    setScanState('summary')
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
        {/* Shared Navbar */}
        <Navbar role="relief_worker" />

        {/* Scan Context Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] backdrop-blur-xl bg-black/10">
          <button
            onClick={handleEndSession}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            End Session
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
                <div className="absolute inset-0 bg-emerald-500/10 border-2 border-emerald-400 rounded-2xl transition-all z-10" />
              )}
            </div>
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
                  disabled={isSubmitting}
                  className={`flex-[2] py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${isSubmitting
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white/80 cursor-wait'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Redeeming Stub...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Confirm &amp; Distribute Aid
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Result feedback */}
        {result && (
          <div className={`mx-4 mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 ${result.status === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={result.status === 'success' ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
            </svg>
            {result.message}
          </div>
        )}

        {/* End Session Confirmation Modal */}
        {scanState === 'confirming' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancelEndSession} />
            <div className="relative w-full max-w-sm mx-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/[0.1] shadow-2xl overflow-hidden">
              <div className="px-5 py-4 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">End Session?</p>
                  <p className="text-[10px] text-amber-400/80">This will burn claimed tokens on-chain</p>
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm text-slate-300 mb-5">
                  All aid tokens you distributed today will be permanently burned on the Cardano blockchain. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelEndSession}
                    className="flex-1 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 text-sm font-semibold hover:bg-white/[0.08] hover:text-white transition-all active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmBurn}
                    className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-bold shadow-lg shadow-red-500/25 hover:shadow-red-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Confirm &amp; Burn Tokens
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Burning Progress Screen */}
        {scanState === 'burning' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="relative text-center px-6">
              <svg className="w-12 h-12 text-orange-400 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-lg font-bold text-white mb-1">Burning Claimed Tokens</p>
              <p className="text-sm text-slate-400">Processing multi-sig transactions on Cardano...</p>
              <p className="text-xs text-slate-500 mt-2">Please do not close this page</p>
            </div>
          </div>
        )}

        {/* Burn Summary Screen */}
        {scanState === 'summary' && burnResult && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div className="relative w-full max-w-sm mx-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/[0.1] shadow-2xl overflow-hidden">
              <div className={`px-5 py-4 border-b flex items-center gap-3 ${
                burnResult.errors.length === 0
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : burnResult.burned > 0
                  ? 'bg-amber-500/10 border-amber-500/20'
                  : 'bg-red-500/10 border-red-500/20'
              }`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  burnResult.errors.length === 0
                    ? 'bg-emerald-500/20'
                    : burnResult.burned > 0
                    ? 'bg-amber-500/20'
                    : 'bg-red-500/20'
                }`}>
                  <svg className={`w-5 h-5 ${
                    burnResult.errors.length === 0
                      ? 'text-emerald-400'
                      : burnResult.burned > 0
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d={burnResult.errors.length === 0
                        ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"} />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Session Complete</p>
                  <p className={`text-[10px] ${
                    burnResult.errors.length === 0 ? 'text-emerald-400/80' : 'text-amber-400/80'
                  }`}>
                    {burnResult.total === 0
                      ? 'No claimed tokens to burn today'
                      : `${burnResult.burned}/${burnResult.total} tokens burned`}
                  </p>
                </div>
              </div>
              <div className="p-5">
                {burnResult.total === 0 && (
                  <p className="text-sm text-slate-400 mb-5">No tokens were claimed during this session today.</p>
                )}
                {burnResult.burned > 0 && (
                  <p className="text-sm text-slate-300 mb-3">
                    Successfully burned {burnResult.burned} token{burnResult.burned !== 1 ? 's' : ''} on Cardano.
                  </p>
                )}
                {burnResult.errors.length > 0 && (
                  <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs font-semibold text-red-400 mb-1">
                      {burnResult.errors.length} error{burnResult.errors.length !== 1 ? 's' : ''}:
                    </p>
                    <ul className="space-y-1">
                      {burnResult.errors.map((err, i) => (
                        <li key={i} className="text-[11px] text-red-300/80">{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <button
                  onClick={handleBack}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Return to Dashboard
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
