"use client"

/**
 * =============================================================================
 * BENEFICIARY BROWSER — Filter & browse beneficiaries
 * =============================================================================
 *
 * KEY PATTERNS TO LEARN:
 * 1. `useState` for filter state (controlled inputs)
 * 2. `useMemo` for derived/filtered data (performance optimization)
 * 3. Set-based selection tracking (O(1) add/remove/check)
 * 4. Conditional rendering based on state
 */

import { useState, useMemo } from 'react'
import { MOCK_BENEFICIARIES, REGIONS } from './mock-data'

export default function BeneficiaryBrowserClient() {
  // ---------------------------------------------------------------------------
  // FILTER STATE
  // Each filter is a controlled input — React owns the value, not the DOM.
  // When the user changes a dropdown, we call the setter, React re-renders,
  // and `useMemo` below recomputes the filtered list.
  // ---------------------------------------------------------------------------
  const [regionFilter, setRegionFilter] = useState<string>('all')
  const [disasterFilter, setDisasterFilter] = useState<string>('all')

  // ---------------------------------------------------------------------------
  // SELECTION STATE
  // We use a Set for O(1) lookups. `selectedIds` tracks which beneficiary IDs
  // the admin has checked for batch minting.
  // ---------------------------------------------------------------------------
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isMinting, setIsMinting] = useState(false)
  const [mintResult, setMintResult] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // DERIVED DATA — useMemo
  // `useMemo` recalculates ONLY when its dependency array changes.
  // Without it, filtering would run on EVERY render (even unrelated state changes).
  // ---------------------------------------------------------------------------
  const filteredBeneficiaries = useMemo(() => {
    return MOCK_BENEFICIARIES.filter((b) => {
      if (regionFilter !== 'all' && b.region !== regionFilter) return false
      if (disasterFilter === 'yes' && !b.is_disaster_affected) return false
      if (disasterFilter === 'no' && b.is_disaster_affected) return false
      return true
    })
  }, [regionFilter, disasterFilter])

  // ---------------------------------------------------------------------------
  // SELECTION HANDLERS
  // We create a NEW Set each time (immutability) so React detects the change.
  // ---------------------------------------------------------------------------
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(filteredBeneficiaries.map((b) => b.id)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  const resetFilters = () => {
    setRegionFilter('all')
    setDisasterFilter('all')
    setSelectedIds(new Set())
  }

  // Count how many of the currently selected IDs are in the filtered view
  const selectedInView = filteredBeneficiaries.filter((b) => selectedIds.has(b.id)).length

  const handleMint = async () => {
    if (selectedIds.size === 0) return
    setIsMinting(true)
    setMintResult(null)
    // Simulate blockchain minting delay
    await new Promise((r) => setTimeout(r, 2500))
    setIsMinting(false)
    setMintResult(`Successfully minted ${selectedIds.size} claim stub token(s). Transaction hash: 0x${Math.random().toString(16).slice(2, 10)}...`)
    setSelectedIds(new Set())
  }

  return (
    <div className="space-y-6">
      {/* ===== FILTER CONTROLS ===== */}
      <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Eligibility Filters</h2>
            <p className="text-xs text-slate-500">Narrow down beneficiaries by location and disaster status</p>
          </div>
          <button
            onClick={resetFilters}
            className="ml-auto text-[10px] font-medium text-slate-500 hover:text-white transition-colors uppercase tracking-wider"
          >
            Reset All
          </button>
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FilterDropdown
            label="Region"
            value={regionFilter}
            onChange={setRegionFilter}
            options={[{ value: 'all', label: 'All Regions' }, ...REGIONS.map((r) => ({ value: r, label: r }))]}
          />
          <FilterDropdown
            label="Disaster Affected"
            value={disasterFilter}
            onChange={setDisasterFilter}
            options={[
              { value: 'all', label: 'Any' },
              { value: 'yes', label: 'Yes' },
              { value: 'no', label: 'No' },
            ]}
          />
        </div>

        {/* Results Summary Bar */}
        <div className="mt-4 flex items-center justify-between px-1">
          <p className="text-xs text-slate-500">
            Showing <span className="text-white font-semibold">{filteredBeneficiaries.length}</span> of {MOCK_BENEFICIARIES.length} beneficiaries
          </p>
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-[10px] font-medium text-blue-400 hover:text-blue-300 transition-colors uppercase tracking-wider">
              Select All
            </button>
            <button onClick={deselectAll} className="text-[10px] font-medium text-slate-500 hover:text-white transition-colors uppercase tracking-wider">
              Deselect All
            </button>
          </div>
        </div>
      </div>

      {/* ===== RESULTS TABLE ===== */}
      <div className="rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="p-3 w-10">
                  <span className="sr-only">Select</span>
                </th>
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
                    <tr
                      key={b.id}
                      onClick={() => toggleSelect(b.id)}
                      className={`border-b border-white/[0.04] cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'bg-blue-500/10 hover:bg-blue-500/15'
                          : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <td className="p-3">
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? 'border-blue-400 bg-blue-500'
                              : 'border-slate-600'
                          }`}
                        >
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

      {/* ===== MINT ACTION PANEL ===== */}
      <div className={`rounded-2xl border overflow-hidden transition-all duration-300 ${
        selectedIds.size > 0
          ? 'bg-emerald-500/[0.06] border-emerald-500/20 backdrop-blur-xl'
          : 'bg-white/[0.02] border-white/[0.06]'
      }`}>
        <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <h3 className="text-sm font-semibold text-white">Mint Claim Stub Tokens</h3>
            </div>
            <p className="text-xs text-slate-500">
              {selectedIds.size > 0
                ? <><span className="text-emerald-400 font-bold">{selectedIds.size}</span> beneficiar{selectedIds.size === 1 ? 'y' : 'ies'} selected ({selectedInView} visible in current filter)</>
                : 'Select beneficiaries above to enable minting'
              }
            </p>
          </div>
          <button
            onClick={handleMint}
            disabled={selectedIds.size === 0 || isMinting}
            className={`px-6 py-3 rounded-xl text-sm font-bold tracking-wide uppercase transition-all duration-300 flex items-center gap-2 ${
              selectedIds.size > 0 && !isMinting
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98]'
                : isMinting
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white/80 cursor-wait'
                : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
            }`}
          >
            {isMinting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Minting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Mint Tokens
              </>
            )}
          </button>
        </div>

        {/* Mint Result */}
        {mintResult && (
          <div className="px-5 pb-4">
            <div className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium flex items-start gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {mintResult}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// FILTER DROPDOWN — Reusable sub-component
// =============================================================================
/**
 * WHY A SEPARATE COMPONENT?
 * We have filters that all look the same. Instead of copy-pasting the same
 * <select> markup, we extract it into a reusable component.
 * This is the DRY principle (Don't Repeat Yourself).
 */
function FilterDropdown({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (val: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg bg-white/[0.06] border border-white/[0.1] text-xs text-white px-3 py-2 outline-none focus:border-blue-500/40 transition-colors appearance-none cursor-pointer"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em', paddingRight: '2rem' }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
