"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const MOCK_DISASTERS = [
  { id: '1', system_code: 'TY-2026-001', name: 'Typhoon Aghon' },
  { id: '2', system_code: 'EQ-2026-003', name: 'Mindanao Earthquake 6.2' },
  { id: '3', system_code: 'FL-2026-007', name: 'Cagayan Valley Flooding' },
]

const AID_TYPES = [
  { value: 'Food Ration', label: 'Food Ration', icon: '🍚', desc: 'Rice, canned goods, water' },
  { value: 'Medical Kit', label: 'Medical Kit', icon: '🏥', desc: 'First aid, medicines' },
  { value: 'Cash Assistance', label: 'Cash Assistance', icon: '💰', desc: 'Direct financial aid' },
  { value: 'Hygiene Kit', label: 'Hygiene Kit', icon: '🧴', desc: 'Soap, sanitizer, masks' },
]

export default function LockInSessionClient() {
  const router = useRouter()
  const [selectedDisaster, setSelectedDisaster] = useState('')
  const [selectedAid, setSelectedAid] = useState('')
  const [isLocking, setIsLocking] = useState(false)

  const canLockIn = selectedDisaster && selectedAid

  const handleLockIn = async () => {
    if (!canLockIn) return
    setIsLocking(true)
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1800))
    router.push('/worker/dashboard/scan')
  }

  const selectedDisasterData = MOCK_DISASTERS.find(d => d.id === selectedDisaster)

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950" />
      <div
        className="fixed inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
                            radial-gradient(ellipse at 80% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
                            radial-gradient(ellipse at 50% 80%, rgba(14, 165, 233, 0.1) 0%, transparent 50%)`,
        }}
      />
      {/* Floating orbs */}
      <div className="fixed top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-sm">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-blue-300 tracking-wide uppercase">Relief Operations Active</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-2">
            Lock In Session
          </h1>
          <p className="text-slate-400 text-sm max-w-sm mx-auto leading-relaxed">
            Configure your distribution session before scanning beneficiary IDs
          </p>
        </div>

        {/* Main card */}
        <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/20 overflow-hidden">
          {/* Step 1: Disaster Selection */}
          <div className="p-6 border-b border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Active Disaster Event</h2>
                <p className="text-xs text-slate-500">Select the relief operation you are assigned to</p>
              </div>
            </div>
            <div className="space-y-2">
              {MOCK_DISASTERS.map(d => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDisaster(d.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-200 group ${
                    selectedDisaster === d.id
                      ? 'bg-blue-500/15 border-blue-500/40 shadow-lg shadow-blue-500/5'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className={`text-[10px] font-mono tracking-wider ${
                        selectedDisaster === d.id ? 'text-blue-400' : 'text-slate-500'
                      }`}>
                        {d.system_code}
                      </span>
                      <p className={`text-sm font-medium mt-0.5 ${
                        selectedDisaster === d.id ? 'text-white' : 'text-slate-300'
                      }`}>
                        {d.name}
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      selectedDisaster === d.id
                        ? 'border-blue-400 bg-blue-500'
                        : 'border-slate-600'
                    }`}>
                      {selectedDisaster === d.id && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Aid Type */}
          <div className="p-6 border-b border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Aid Type</h2>
                <p className="text-xs text-slate-500">Choose what you will be distributing</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {AID_TYPES.map(aid => (
                <button
                  key={aid.value}
                  type="button"
                  onClick={() => setSelectedAid(aid.value)}
                  className={`text-left px-3 py-3 rounded-xl border transition-all duration-200 ${
                    selectedAid === aid.value
                      ? 'bg-emerald-500/15 border-emerald-500/40 shadow-lg shadow-emerald-500/5'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]'
                  }`}
                >
                  <span className="text-xl mb-1 block">{aid.icon}</span>
                  <p className={`text-xs font-semibold ${
                    selectedAid === aid.value ? 'text-white' : 'text-slate-300'
                  }`}>{aid.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{aid.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Session Summary */}
          {canLockIn && (
            <div className="px-6 py-4 bg-white/[0.02] border-b border-white/[0.06]">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-medium text-amber-400/80">Session Summary</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Operation</p>
                  <p className="text-xs text-white font-medium mt-0.5">{selectedDisasterData?.name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Distributing</p>
                  <p className="text-xs text-white font-medium mt-0.5">{selectedAid}</p>
                </div>
              </div>
            </div>
          )}

          {/* Lock In Button */}
          <div className="p-6">
            <button
              type="button"
              onClick={handleLockIn}
              disabled={!canLockIn || isLocking}
              className={`w-full relative overflow-hidden rounded-xl py-4 text-sm font-bold tracking-wide uppercase transition-all duration-300 ${
                canLockIn && !isLocking
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]'
                  : isLocking
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white/80 cursor-wait'
                  : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
              }`}
            >
              {/* Shimmer effect when ready */}
              {canLockIn && !isLocking && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
              )}
              <span className="relative flex items-center justify-center gap-2">
                {isLocking ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Locking In...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Lock In &amp; Start Scanning
                  </>
                )}
              </span>
            </button>
            {!canLockIn && (
              <p className="text-center text-[11px] text-slate-600 mt-3">
                Select a disaster event and aid type to continue
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-600 mt-6">
          ResQ • Cryptographic Aid Distribution System
        </p>
      </div>

      {/* Shimmer animation keyframe */}
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
