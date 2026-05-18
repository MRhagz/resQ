"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { parsePhilSysQR } from '@/utils/philsys'
import { lookupBeneficiaryTokens, type LedgerData, type LedgerEntry } from '@/app/actions/transparency'

const QrScanner = dynamic(() => import('@/components/Scanner'), { ssr: false })

type Tab = 'ledger' | 'lookup'
type LookupState = 'idle' | 'scanning' | 'loading' | 'result'

interface TokenRecord {
  id: string; disasterName: string; disasterCode: string; aidType: string
  agency: string; claimed: boolean; claimedAt: string | null; createdAt: string
}

interface BeneficiaryInfo {
  systemId: string; registeredAt: string; region: string
}

interface LookupResult {
  beneficiary?: BeneficiaryInfo; tokens?: TokenRecord[]; message: string
  status: string
}

export default function TransparencyClient({ ledgerData }: { ledgerData: LedgerData }) {
  const [activeTab, setActiveTab] = useState<Tab>('ledger')
  const [lookupState, setLookupState] = useState<LookupState>('idle')
  const [result, setResult] = useState<LookupResult | null>(null)
  const [manualId, setManualId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Filter ledger entries by date range
  const filteredEntries = useMemo(() => {
    let entries = [...ledgerData.entries]
    if (dateFrom) {
      const from = new Date(dateFrom)
      entries = entries.filter(e => new Date(e.mintedAt) >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      entries = entries.filter(e => new Date(e.mintedAt) <= to)
    }
    return entries
  }, [ledgerData.entries, dateFrom, dateTo])

  const handleScan = async (rawData: string) => {
    if (lookupState === 'loading') return
    setLookupState('loading')
    const parsed = parsePhilSysQR(rawData)
    const idToLookup = parsed ? parsed.philsysNumber : rawData.trim()
    const res = await lookupBeneficiaryTokens(idToLookup)
    setResult(res)
    setLookupState('result')
  }

  const handleManualLookup = async () => {
    if (!manualId.trim() || lookupState === 'loading') return
    setLookupState('loading')
    const res = await lookupBeneficiaryTokens(manualId.trim())
    setResult(res)
    setLookupState('result')
  }

  const resetLookup = () => { setLookupState('idle'); setResult(null); setManualId('') }

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950" />
      <div className="fixed inset-0 opacity-30" style={{ backgroundImage: `radial-gradient(ellipse at 20% 50%, rgba(59,130,246,0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(99,102,241,0.15) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(14,165,233,0.1) 0%, transparent 50%)` }} />
      <div className="fixed top-1/4 left-1/6 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="fixed bottom-1/3 right-1/4 w-96 h-96 bg-indigo-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Nav */}
        <nav className="border-b border-white/[0.06] backdrop-blur-xl bg-black/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                </div>
                <span className="text-xl font-bold text-white tracking-tight">ResQ</span>
              </Link>
              <div className="flex items-center gap-3 sm:gap-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[10px] font-medium text-emerald-300 tracking-wide uppercase">Public Access</span>
                </div>
                <Link href="/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.08] border border-white/[0.1] text-white text-sm font-semibold hover:bg-white/[0.15] hover:border-white/[0.2] transition-all duration-200 backdrop-blur-sm shadow-lg shadow-black/10">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                  Staff Portal
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Header */}
        <header className="px-4 sm:px-8 py-6 border-b border-white/[0.06] backdrop-blur-xl bg-black/10">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Public Transparency Portal</h1>
              <p className="text-sm text-slate-500 mt-1">Verify aid distribution and check beneficiary eligibility</p>
            </div>
            <nav className="flex bg-white/[0.04] rounded-xl border border-white/[0.08] p-1">
              <TabBtn active={activeTab==='ledger'} onClick={()=>setActiveTab('ledger')} label="Distribution Ledger" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
              <TabBtn active={activeTab==='lookup'} onClick={()=>{setActiveTab('lookup');resetLookup()}} label="My Tokens" icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9a3 3 0 11-6 0 3 3 0 016 0zm-3 9c-4 0-7-1.79-7-4v-1h14v1c0 2.21-3 4-7 4z" /></svg>} />
            </nav>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 sm:px-8 py-8">
          <div className="max-w-7xl mx-auto">

            {activeTab === 'ledger' && (
              <div className="space-y-6">
                {/* Network status badge */}
                <div className="flex items-center justify-between">
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${ledgerData.source === 'blockchain' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${ledgerData.source === 'blockchain' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    {ledgerData.source === 'blockchain' ? `Live — Cardano ${ledgerData.network}` : 'Blockchain Unavailable'}
                  </div>
                  {ledgerData.metrics.policyId && ledgerData.metrics.policyId !== 'N/A' && (
                    <span className="text-[10px] font-mono text-slate-600 hidden sm:block">Policy: {ledgerData.metrics.policyId.slice(0, 12)}…{ledgerData.metrics.policyId.slice(-8)}</span>
                  )}
                </div>
                {/* Metrics */}
                <div className="grid gap-4 md:grid-cols-3">
                  <MetricCard title="Cardano Network" icon="⚡" value={<span className="flex items-center gap-2"><span className={`w-3 h-3 rounded-full ${ledgerData.source === 'blockchain' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />{ledgerData.source === 'blockchain' ? `${ledgerData.network} Connected` : 'Awaiting Connection'}</span>} color={ledgerData.source === 'blockchain' ? 'emerald' : 'blue'} />
                  <MetricCard title="On-Chain Tokens" icon="📋" value={<span className="text-white">{ledgerData.metrics.totalAssets}</span>} color="white" />
                  <MetricCard title="Policy ID" icon="🔑" value={<span className="text-[11px] font-mono text-slate-400 truncate">{ledgerData.metrics.policyId !== 'N/A' ? ledgerData.metrics.policyId.slice(0, 16) + '…' : '—'}</span>} color="white" />
                </div>
                {/* Table */}
                <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] overflow-hidden">
                  <div className="p-5 border-b border-white/[0.06] space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                          <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        </div>
                        <div><h2 className="text-sm font-semibold text-white">On-Chain Claim Tokens</h2><p className="text-xs text-slate-500">{filteredEntries.length} of {ledgerData.entries.length} token(s) shown</p></div>
                      </div>
                    </div>
                    {/* Date Filter */}
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Filter by date:</span>
                      <div className="flex items-center gap-2">
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-colors [color-scheme:dark]" />
                        <span className="text-xs text-slate-600">to</span>
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white focus:outline-none focus:border-indigo-500/50 transition-colors [color-scheme:dark]" />
                      </div>
                      {(dateFrom || dateTo) && (
                        <button onClick={() => { setDateFrom(''); setDateTo('') }} className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Clear</button>
                      )}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead><tr className="border-b border-white/[0.06]">
                        <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Token Name</th>
                        <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Disaster Code</th>
                        <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Aid Type</th>
                        <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tx Hash</th>
                        <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider text-right">Minted At</th>
                      </tr></thead>
                      <tbody>
                        {filteredEntries.length === 0 ? (
                          <tr><td colSpan={5} className="h-48 text-center">
                            <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
                              <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                              <span className="font-medium text-sm">
                                {ledgerData.source === 'unavailable' ? 'Blockchain Not Connected' :
                                 (dateFrom || dateTo) && ledgerData.entries.length > 0 ? 'No Tokens in Date Range' :
                                 'No Tokens Minted Yet'}
                              </span>
                              <span className="text-xs">
                                {ledgerData.source === 'unavailable' ? 'Set BLOCKFROST_API_KEY and SYSTEM_POLICY_ID in .env to connect.' :
                                 (dateFrom || dateTo) && ledgerData.entries.length > 0 ? 'Try adjusting the date filter to see more results.' :
                                 'Claim tokens will appear here once minted on-chain.'}
                              </span>
                              {(dateFrom || dateTo) && ledgerData.entries.length > 0 && (
                                <button onClick={() => { setDateFrom(''); setDateTo('') }} className="mt-2 px-4 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-semibold hover:bg-indigo-500/20 transition-colors">Clear Filter</button>
                              )}
                            </div>
                          </td></tr>
                        ) : (
                          filteredEntries.map((entry: LedgerEntry) => (
                            <tr key={entry.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                              <td className="p-3">
                                <p className="text-sm text-white font-medium">{entry.tokenName}</p>
                                <p className="text-[10px] font-mono text-slate-500">{entry.assetFingerprint ? entry.assetFingerprint.slice(0, 16) + '…' : ''}</p>
                              </td>
                              <td className="p-3">
                                <span className="text-xs font-mono text-blue-400">{entry.disasterCode}</span>
                              </td>
                              <td className="p-3 text-sm text-slate-300">{entry.aidType}</td>
                              <td className="p-3">
                                {entry.mintTxHash && entry.mintTxHash !== 'unknown' ? (
                                  <a href={`${ledgerData.explorerUrl}/transaction/${entry.mintTxHash}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-indigo-400 hover:text-indigo-300 underline decoration-indigo-400/30 hover:decoration-indigo-300/50 transition-colors">
                                    {entry.mintTxHash.slice(0, 8)}…{entry.mintTxHash.slice(-6)}
                                  </a>
                                ) : (
                                  <span className="text-[10px] text-slate-600">—</span>
                                )}
                              </td>
                              <td className="p-3 text-xs text-slate-400 text-right">{fmt(entry.mintedAt)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'lookup' && (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Scan Card */}
                {lookupState !== 'result' && (
                  <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] shadow-2xl shadow-black/20 overflow-hidden">
                    <div className="p-5 border-b border-white/[0.06]">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                          <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                        </div>
                        <div>
                          <h2 className="text-sm font-semibold text-white">Check My Aid Tokens</h2>
                          <p className="text-xs text-slate-500">Scan your PhilSys National ID QR code to view your token history</p>
                        </div>
                      </div>
                      <div className="px-4 py-3 rounded-xl bg-indigo-500/[0.06] border border-indigo-500/15">
                        <div className="flex items-start gap-3">
                          <svg className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          <div className="text-xs text-slate-400 space-y-1">
                            <p>Your PhilSys Number is <span className="text-indigo-300 font-medium">hashed on the server</span> — we never store your actual ID.</p>
                            <p>This lookup shows all <span className="text-indigo-300 font-medium">eligible and claimed</span> aid tokens linked to your identity.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      {/* QR Scanner */}
                      {(lookupState === 'idle' || lookupState === 'scanning') && (
                        <div className="relative rounded-xl overflow-hidden bg-black/40 border border-white/[0.08] aspect-[4/3]">
                          <QrScanner
                            onScan={(r: any) => { if (r?.length > 0) handleScan(r[0].rawValue) }}
                            onError={(e: any) => console.error(e)}
                            components={{ audio: false, onOff: false, torch: false, zoom: false, finder: true }}
                          />
                        </div>
                      )}

                      {lookupState === 'loading' && (
                        <div className="flex flex-col items-center justify-center py-16 space-y-3">
                          <svg className="w-8 h-8 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          <p className="text-sm text-white font-medium">Looking up your tokens...</p>
                          <p className="text-[10px] text-slate-500">Hashing identity & querying ledger</p>
                        </div>
                      )}

                      {/* Manual entry */}
                      {lookupState !== 'loading' && (
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 text-center">Or enter your PhilSys Number manually</p>
                          <div className="flex gap-2">
                            <input value={manualId} onChange={e => setManualId(e.target.value)} placeholder="e.g. PSN-1234-5678-9012" className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white placeholder-slate-600 text-sm font-medium focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all" onKeyDown={e => e.key === 'Enter' && handleManualLookup()} />
                            <button onClick={handleManualLookup} disabled={!manualId.trim()} className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100">
                              Lookup
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Results */}
                {lookupState === 'result' && result && (
                  <div className="space-y-4">
                    {result.status === 'not_found' && (
                      <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-8 text-center space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/15 flex items-center justify-center">
                          <svg className="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="text-lg font-bold text-white">Not Found</h3>
                        <p className="text-sm text-slate-400 max-w-sm mx-auto">{result.message}</p>
                        <button onClick={resetLookup} className="mt-4 px-6 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm font-semibold hover:bg-white/[0.1] transition-all">Try Again</button>
                      </div>
                    )}

                    {result.status === 'error' && (
                      <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-6 text-center space-y-2">
                        <p className="text-sm text-red-400 font-medium">{result.message}</p>
                        <button onClick={resetLookup} className="mt-2 px-6 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm font-semibold hover:bg-white/[0.1] transition-all">Try Again</button>
                      </div>
                    )}

                    {result.status === 'success' && result.beneficiary && (
                      <>
                        {/* Beneficiary Card */}
                        <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] overflow-hidden">
                          <div className="px-5 py-4 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">Beneficiary Verified</p>
                              <p className="text-[10px] text-emerald-400/80">Identity found in the system</p>
                            </div>
                          </div>
                          <div className="p-5 grid grid-cols-3 gap-4">
                            <div><p className="text-[10px] text-slate-500 uppercase tracking-wider">System ID</p><p className="text-xs text-white font-mono mt-1">{result.beneficiary.systemId.slice(0,8)}...</p></div>
                            <div><p className="text-[10px] text-slate-500 uppercase tracking-wider">Region</p><p className="text-xs text-white font-medium mt-1">{result.beneficiary.region}</p></div>
                            <div><p className="text-[10px] text-slate-500 uppercase tracking-wider">Registered</p><p className="text-xs text-white font-medium mt-1">{fmt(result.beneficiary.registeredAt)}</p></div>
                          </div>
                        </div>

                        {/* Token List */}
                        <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] overflow-hidden">
                          <div className="p-5 border-b border-white/[0.06] flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            </div>
                            <div><h2 className="text-sm font-semibold text-white">Token History</h2><p className="text-xs text-slate-500">{result.tokens?.length ?? 0} token(s) found</p></div>
                          </div>

                          {(!result.tokens || result.tokens.length === 0) ? (
                            <div className="p-8 text-center">
                              <p className="text-sm text-slate-500">No tokens assigned yet.</p>
                              <p className="text-xs text-slate-600 mt-1">You will see tokens here once an admin approves aid for your profile.</p>
                            </div>
                          ) : (
                            <div>
                              {/* Summary stats */}
                              <div className="p-4 border-b border-white/[0.04] flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                  <span className="text-xs text-slate-400"><span className="text-emerald-400 font-bold">{result.tokens.filter(t => t.claimed).length}</span> claimed</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                                  <span className="text-xs text-slate-400"><span className="text-amber-400 font-bold">{result.tokens.filter(t => !t.claimed).length}</span> eligible</span>
                                </div>
                              </div>
                              <div className="divide-y divide-white/[0.04]">
                                {[...result.tokens]
                                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                                  .map(t => (
                                  <div key={t.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className="text-[10px] font-mono text-blue-400">{t.disasterCode}</span>
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${t.claimed ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                                            {t.claimed ? 'CLAIMED' : 'ELIGIBLE'}
                                          </span>
                                        </div>
                                        <p className="text-sm text-white font-medium">{t.disasterName}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{t.aidType} • via {t.agency}</p>
                                      </div>
                                      <div className="text-right flex-shrink-0">
                                        <p className="text-[10px] text-slate-500">{t.claimed ? 'Claimed' : 'Issued'}</p>
                                        <p className="text-xs text-slate-400">{fmt(t.claimed && t.claimedAt ? t.claimedAt : t.createdAt)}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="text-center">
                          <button onClick={resetLookup} className="px-6 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm font-semibold hover:bg-white/[0.1] transition-all">Scan Another ID</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <footer className="px-4 py-6 border-t border-white/[0.04] text-center">
          <p className="text-[11px] text-slate-600">&copy; {new Date().getFullYear()} ResQ Disaster Management System. For demonstration purposes only.</p>
        </footer>
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, label, icon }: { active: boolean; onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${active ? 'bg-white/[0.1] text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>
      {icon}{label}
    </button>
  )
}

function MetricCard({ title, icon, value, color }: { title: string; icon: string; value: React.ReactNode; color: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-400">{title}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`text-xl font-bold ${color === 'blue' ? 'text-blue-400' : color === 'emerald' ? 'text-emerald-400' : 'text-white'}`}>{value}</div>
    </div>
  )
}
