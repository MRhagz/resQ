"use client"

/**
 * CLAIM STUB DISTRIBUTION — Filter, select, and create claim stubs
 *
 * Flow: Filter Beneficiaries → Select → Configure → Create Claim Stubs
 * Stubs are stored in Supabase's claim_stubs table.
 * Workers later redeem stubs by scanning beneficiary QR codes.
 */

import { useState, useMemo } from 'react'
import {
  MOCK_BENEFICIARIES,
  MOCK_DISASTERS,
  MOCK_CLAIM_STUBS,
  REGIONS,
  AID_TYPES,
  type ClaimStub,
} from './mock-data'

// Mock admin agency — in production, fetched from staff_profiles.agency
const MOCK_ADMIN_AGENCY = 'DSWD'

export default function TokenDistributionClient() {
  // Filter State
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [disasterAffectedFilter, setDisasterAffectedFilter] = useState<string>('all')

  // Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Campaign Config
  const [disasterEventId, setDisasterEventId] = useState<string>('')
  const [aidType, setAidType] = useState<string>(AID_TYPES[0])

  // Action State
  const [isRecording, setIsRecording] = useState(false)
  const [result, setResult] = useState<{ status: string; message: string } | null>(null)
  const [stubs, setStubs] = useState<ClaimStub[]>(MOCK_CLAIM_STUBS)

  // Filtered Data
  const filteredBeneficiaries = useMemo(() => {
    return MOCK_BENEFICIARIES.filter((b) => {
      if (regionFilter !== 'all' && b.region !== regionFilter) return false
      if (disasterAffectedFilter === 'yes' && !b.is_disaster_affected) return false
      if (disasterAffectedFilter === 'no' && b.is_disaster_affected) return false
      return true
    })
  }, [regionFilter, disasterAffectedFilter])

  // Handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => setSelectedIds(new Set(filteredBeneficiaries.map((b) => b.id)))
  const deselectAll = () => setSelectedIds(new Set())

  const resetFilters = () => {
    setRegionFilter('all')
    setDisasterAffectedFilter('all')
    setSelectedIds(new Set())
  }

  const handleCreateStubs = async () => {
    if (selectedIds.size === 0 || !disasterEventId) return
    setIsRecording(true)
    setResult(null)

    // Simulate server action delay (in production, calls createClaimStubs server action)
    await new Promise((r) => setTimeout(r, 1800))

    const newStubs: ClaimStub[] = Array.from(selectedIds).map((beneficiaryId, i) => ({
      id: `cs${Date.now()}-${i}`,
      beneficiary_id: beneficiaryId,
      disaster_event_id: disasterEventId,
      aid_type: aidType,
      agency: MOCK_ADMIN_AGENCY,
      approved_by: 'admin-current',
      claimed: false,
      claimed_by: null,
      claimed_at: null,
      created_at: new Date().toISOString(),
    }))

    setStubs((prev) => [...newStubs, ...prev])
    setIsRecording(false)
    setResult({
      status: 'success',
      message: `Created ${newStubs.length} claim stub(s) via ${MOCK_ADMIN_AGENCY}. Beneficiaries can now receive ${aidType} at distribution points.`,
    })
    setSelectedIds(new Set())
  }

  const selectedInView = filteredBeneficiaries.filter((b) => selectedIds.has(b.id)).length
  const activeDisasters = MOCK_DISASTERS.filter((d) => d.status === 'ACTIVE')

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  const getBeneficiaryName = (id: string) =>
    MOCK_BENEFICIARIES.find((b) => b.id === id)?.full_name ?? id

  const getDisasterName = (id: string) =>
    MOCK_DISASTERS.find((d) => d.id === id)?.name ?? id

  return (
    <div className="space-y-6">
      {/* SECTION 1: ELIGIBILITY FILTERS */}
      <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Eligibility Filters</h2>
            <p className="text-xs text-slate-500">Narrow down eligible victims by location and disaster status</p>
          </div>
          <button onClick={resetFilters} className="ml-auto text-[10px] font-medium text-slate-500 hover:text-white transition-colors uppercase tracking-wider">
            Reset All
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FilterDropdown label="Region" value={regionFilter} onChange={setRegionFilter}
            options={[{ value: 'all', label: 'All Regions' }, ...REGIONS.map((r) => ({ value: r, label: r }))]} />
          <FilterDropdown label="Disaster Affected" value={disasterAffectedFilter} onChange={setDisasterAffectedFilter}
            options={[{ value: 'all', label: 'Any' }, { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} />
        </div>

        <div className="mt-4 flex items-center justify-between px-1">
          <p className="text-xs text-slate-500">
            Showing <span className="text-white font-semibold">{filteredBeneficiaries.length}</span> of {MOCK_BENEFICIARIES.length} beneficiaries
          </p>
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-[10px] font-medium text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider">Select All</button>
            <button onClick={deselectAll} className="text-[10px] font-medium text-slate-500 hover:text-white transition-colors uppercase tracking-wider">Deselect All</button>
          </div>
        </div>
      </div>

      {/* SECTION 2: BENEFICIARY TABLE */}
      <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="p-3 w-10"><span className="sr-only">Select</span></th>
                <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Region</th>
                <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Barangay</th>
                <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredBeneficiaries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-slate-600 italic">
                    No beneficiaries match the current filters.
                  </td>
                </tr>
              ) : (
                filteredBeneficiaries.map((b) => {
                  const isSelected = selectedIds.has(b.id)
                  return (
                    <tr key={b.id} onClick={() => toggleSelect(b.id)}
                      className={`border-b border-white/[0.04] cursor-pointer transition-all duration-150 ${isSelected ? 'bg-violet-500/10 hover:bg-violet-500/15' : 'hover:bg-white/[0.03]'
                        }`}>
                      <td className="p-3">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${isSelected ? 'border-violet-400 bg-violet-500' : 'border-slate-600'
                          }`}>
                          {isSelected && (
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="text-sm font-medium text-white">{b.full_name}</p>
                        <p className="text-[10px] font-mono text-slate-600 mt-0.5">{b.philsys_hash}</p>
                      </td>
                      <td className="p-3 text-xs text-slate-300">{b.region}</td>
                      <td className="p-3 text-xs text-slate-400 hidden sm:table-cell">{b.barangay}</td>
                      <td className="p-3">
                        {b.is_disaster_affected ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400">Affected</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-400">Unaffected</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: CAMPAIGN CONFIG + CLAIM STUB ACTION */}
      <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${selectedIds.size > 0 ? 'bg-violet-500/[0.06] border-violet-500/20 backdrop-blur-xl' : 'bg-white/[0.02] border-white/[0.06]'
        }`}>
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Campaign Configuration</h3>
              <p className="text-xs text-slate-500">
                {selectedIds.size > 0
                  ? <><span className="text-violet-400 font-bold">{selectedIds.size}</span> beneficiar{selectedIds.size === 1 ? 'y' : 'ies'} selected ({selectedInView} in view)</>
                  : 'Select beneficiaries above to configure distribution'
                }
              </p>
            </div>
          </div>

          {/* Campaign dropdowns — agency is auto-filled from staff profile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <FilterDropdown label="Disaster Event" value={disasterEventId} onChange={setDisasterEventId}
              options={[{ value: '', label: '— Select Event —' }, ...activeDisasters.map((d) => ({ value: d.id, label: `${d.system_code} — ${d.name}` }))]} />
            <FilterDropdown label="Aid Type" value={aidType} onChange={setAidType}
              options={AID_TYPES.map((t) => ({ value: t, label: t }))} />
          </div>

          {/* Auto-filled agency badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Agency:</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-indigo-500/10 border-indigo-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              <span className="text-[10px] font-semibold text-indigo-300">{MOCK_ADMIN_AGENCY}</span>
            </span>
            <span className="text-[10px] text-slate-600 italic">Auto-filled from your profile</span>
          </div>

          {/* Eligibility Criteria Snapshot */}
          {selectedIds.size > 0 && (
            <div className="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Eligibility Snapshot</p>
              <div className="flex flex-wrap gap-2">
                {regionFilter !== 'all' && <CriteriaBadge label="Region" value={regionFilter} />}
                {disasterAffectedFilter !== 'all' && <CriteriaBadge label="Affected" value={disasterAffectedFilter} />}
                {regionFilter === 'all' && disasterAffectedFilter === 'all' && (
                  <span className="text-[10px] text-slate-600 italic">No filters applied — all beneficiaries eligible</span>
                )}
              </div>
            </div>
          )}

          {/* Create Stubs Button */}
          <button
            onClick={handleCreateStubs}
            disabled={selectedIds.size === 0 || !disasterEventId || isRecording}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-bold tracking-wide uppercase transition-all duration-300 flex items-center justify-center gap-2 ${selectedIds.size > 0 && disasterEventId && !isRecording
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98]'
                : isRecording
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white/80 cursor-wait'
                  : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
              }`}
          >
            {isRecording ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating Stubs...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Create Claim Stubs
              </>
            )}
          </button>

          {!disasterEventId && selectedIds.size > 0 && (
            <p className="text-[10px] text-amber-400 mt-2">⚠ Select a disaster event to enable stub creation</p>
          )}
        </div>

        {/* Result Message */}
        {result && (
          <div className="px-5 py-4">
            <div className={`px-4 py-3 rounded-xl text-xs font-medium flex items-start gap-2 ${result.status === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={result.status === 'success' ? "M5 13l4 4L19 7" : "M6 18L18 6M6 6l12 12"} />
              </svg>
              {result.message}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: CLAIM STUB HISTORY */}
      <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] overflow-hidden">
        <div className="p-5 border-b border-white/[0.06] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Claim Stub History</h2>
            <p className="text-xs text-slate-500">{stubs.length} stub(s) created</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Beneficiary</th>
                <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Disaster</th>
                <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Aid Type</th>
                <th className="p-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Created</th>
              </tr>
            </thead>
            <tbody>
              {stubs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-slate-600 italic">
                    No claim stubs created yet.
                  </td>
                </tr>
              ) : (
                stubs.map((s) => (
                  <tr key={s.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="p-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.claimed
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-amber-500/15 text-amber-400'
                        }`}>{s.claimed ? 'CLAIMED' : 'UNCLAIMED'}</span>
                    </td>
                    <td className="p-3">
                      <p className="text-sm text-white font-medium">{getBeneficiaryName(s.beneficiary_id)}</p>
                      <p className="text-[10px] font-mono text-slate-600">{s.beneficiary_id}</p>
                    </td>
                    <td className="p-3 text-xs text-slate-300 hidden sm:table-cell">{getDisasterName(s.disaster_event_id)}</td>
                    <td className="p-3 text-xs text-white">{s.aid_type}</td>
                    <td className="p-3 text-xs text-slate-500 hidden md:table-cell">{formatDate(s.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Sub-components
function FilterDropdown({ label, value, onChange, options }: {
  label: string; value: string; onChange: (val: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-white/[0.06] border border-white/[0.1] text-xs text-white px-3 py-2 outline-none focus:border-blue-500/40 transition-colors appearance-none cursor-pointer"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em', paddingRight: '2rem' }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

function CriteriaBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[10px] text-violet-300">
      <span className="font-semibold">{label}:</span> {value}
    </span>
  )
}
