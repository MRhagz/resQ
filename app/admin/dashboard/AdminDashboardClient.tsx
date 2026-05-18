"use client"

/**
 * =============================================================================
 * ADMIN DASHBOARD CLIENT — Main client component with tab navigation
 * =============================================================================
 *
 * KEY PATTERN: Tab-based navigation with useState
 * ------------------------------------------------
 * Instead of using separate routes for each section, we use a single page
 * with tabs. This is appropriate when:
 *   - Sections share the same layout/background
 *   - You don't need unique URLs per section
 *   - State needs to be shared between sections
 *
 * For URL-based tabs (bookmarkable), you'd use Next.js parallel routes or
 * searchParams instead.
 */

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import CreateDisasterForm from './CreateDisasterForm'

import TokenDistributionClient from './TokenDistributionClient'
import { type DisasterEvent, type Beneficiary, type ClaimStub } from './mock-data'

type Tab = 'disasters' | 'tokens'

interface Props {
  disasters: DisasterEvent[]
  beneficiaries: Beneficiary[]
  claimStubs: ClaimStub[]
}



export default function AdminDashboardClient({ disasters: initialDisasters, beneficiaries, claimStubs }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('disasters')
  const [disasters, setDisasters] = useState<DisasterEvent[]>(initialDisasters)

  const handleCloseDisaster = (id: string) => {
    setDisasters((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'CLOSED' as const } : d))
    )
  }

  const handleDisasterCreated = (newDisaster: DisasterEvent) => {
    setDisasters((prev) => [newDisaster, ...prev])
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* ===== Background — same as worker pages ===== */}
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
      <div className="fixed top-1/4 left-1/6 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-1/3 right-1/4 w-96 h-96 bg-indigo-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* ===== Content ===== */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Shared Navbar */}
        <Navbar role="super_admin" />

        {/* Page Header with Tabs */}
        <header className="px-4 sm:px-8 py-6 border-b border-white/[0.06] backdrop-blur-xl bg-black/10">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Command Center
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Manage disasters, beneficiaries, and token minting
              </p>
            </div>

            {/* Tab Navigation */}
            <nav className="flex bg-white/[0.04] rounded-xl border border-white/[0.08] p-1">
              <TabButton
                active={activeTab === 'disasters'}
                onClick={() => setActiveTab('disasters')}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                }
                label="Disasters"
              />

              <TabButton
                active={activeTab === 'tokens'}
                onClick={() => setActiveTab('tokens')}
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                }
                label="Token Distribution"
              />
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 px-4 sm:px-8 py-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'disasters' && (
              <DisastersTab disasters={disasters} onClose={handleCloseDisaster} onDisasterCreated={handleDisasterCreated} />
            )}

            {activeTab === 'tokens' && <TokenDistributionClient beneficiaries={beneficiaries} disasters={disasters} initialStubs={claimStubs} />}
          </div>
        </main>

        {/* Footer */}
        <footer className="px-4 py-4 border-t border-white/[0.04] text-center">
          <p className="text-[11px] text-slate-600">
            ResQ • Cryptographic Aid Distribution System
          </p>
        </footer>
      </div>
    </div>
  )
}

// =============================================================================
// TAB BUTTON — Reusable tab control
// =============================================================================
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
        active
          ? 'bg-white/[0.1] text-white shadow-sm'
          : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

// =============================================================================
// DISASTERS TAB — Create form + ledger table
// =============================================================================
function DisastersTab({
  disasters,
  onClose,
  onDisasterCreated,
}: {
  disasters: DisasterEvent[]
  onClose: (id: string) => void
  onDisasterCreated: (disaster: DisasterEvent) => void
}) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Create Form */}
      <div className="lg:col-span-1">
        <CreateDisasterForm onSuccess={onDisasterCreated} />
      </div>

      {/* Right: Disaster Ledger */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] overflow-hidden">
          <div className="p-5 border-b border-white/[0.06] flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Disaster Events Ledger</h2>
              <p className="text-xs text-slate-500">{disasters.length} events recorded</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                  <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Regions</th>
                  <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Created</th>
                  <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody>
                {disasters.map((d) => (
                  <tr key={d.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 font-mono text-xs text-blue-400">{d.system_code}</td>
                    <td className="p-3 text-sm text-white font-medium">{d.name}</td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          d.status === 'ACTIVE'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-slate-500/15 text-slate-400'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-slate-400 hidden sm:table-cell">
                      {d.allowed_regions.join(', ')}
                    </td>
                    <td className="p-3 text-xs text-slate-500 hidden md:table-cell">
                      {formatDate(d.created_at)}
                    </td>
                    <td className="p-3">
                      {d.status === 'ACTIVE' && (
                        <button
                          onClick={() => onClose(d.id)}
                          className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider transition-colors"
                        >
                          Close
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
